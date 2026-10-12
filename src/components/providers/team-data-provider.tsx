"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { fetchPlayers, insertPlayer, updatePlayer as updatePlayerRow, deletePlayer as deletePlayerRow } from "@/lib/data/players";
import { fetchActiveLineup, fetchLineupState, movePlayer as movePlayerRpc } from "@/lib/data/lineup";
import {
  createSignedPhotoUrls,
  prepareImage,
  removeAllPlayerPhotos,
  removePhotoFiles,
  SIGNED_URL_REFRESH_MS,
  uploadPlayerPhoto,
} from "@/lib/data/photos";
import { toUserMessage } from "@/lib/data/errors";
import { applyMove, EMPTY_LINEUP, locatePlayer, pruneUnknownPlayers, type LineupState, type MoveCommand, type PlayerLocation } from "@/lib/lineup/logic";
import { toPlayerPayload, type PlayerFormValues } from "@/lib/validation/player";
import type { MotivationStatus } from "@/lib/domain/motivation";
import type { PlayerRow, TeamRole } from "@/types/database";

export type PhotoChange = { kind: "keep" } | { kind: "replace"; file: File } | { kind: "remove" };

interface TeamInfo {
  id: string;
  name: string;
  role: TeamRole;
}

interface TeamDataContextValue {
  team: TeamInfo;
  currentUserId: string;
  canEdit: boolean;
  status: "loading" | "ready" | "error";
  loadError: string | null;
  players: PlayerRow[];
  playersById: ReadonlyMap<string, PlayerRow>;
  lineupId: string | null;
  lineup: LineupState;
  isSyncing: boolean;
  photoUrl: (player: Pick<PlayerRow, "photo_path"> | null | undefined) => string | null;
  locate: (playerId: string) => PlayerLocation;
  reload: () => Promise<void>;
  setTeamName: (name: string) => void;
  movePlayer: (command: MoveCommand) => Promise<boolean>;
  createPlayer: (values: PlayerFormValues, photo: PhotoChange) => Promise<PlayerRow>;
  updatePlayer: (playerId: string, values: PlayerFormValues, photo: PhotoChange) => Promise<PlayerRow>;
  updateMotivation: (playerId: string, status: MotivationStatus, note: string) => Promise<PlayerRow>;
  changePhoto: (playerId: string, photo: PhotoChange) => Promise<PlayerRow>;
  deletePlayer: (playerId: string) => Promise<void>;
}

const TeamDataContext = createContext<TeamDataContextValue | null>(null);

interface PendingMove {
  id: number;
  command: MoveCommand;
}

export function TeamDataProvider({
  team: initialTeam,
  currentUserId,
  children,
}: {
  team: TeamInfo;
  currentUserId: string;
  children: ReactNode;
}) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [team, setTeam] = useState(initialTeam);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [lineupId, setLineupId] = useState<string | null>(null);
  const [serverLineup, setServerLineup] = useState<LineupState>(EMPTY_LINEUP);
  const [pending, setPending] = useState<PendingMove[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const pendingCountRef = useRef(0);
  const moveSeqRef = useRef(0);
  const lineupIdRef = useRef<string | null>(null);
  const lineupStaleRef = useRef(false);

  const canEdit = team.role === "owner" || team.role === "coach";

  // -------------------------------------------------------------------------
  // Laden
  // -------------------------------------------------------------------------
  const refreshPhotoUrls = useCallback(
    async (list: PlayerRow[]) => {
      const paths = list.map((p) => p.photo_path).filter((p): p is string => Boolean(p));
      try {
        const urls = await createSignedPhotoUrls(supabase, paths);
        setPhotoUrls(urls);
      } catch {
        // Fotos sind nicht kritisch – Initialen werden als Fallback angezeigt.
      }
    },
    [supabase],
  );

  const loadPlayers = useCallback(async () => {
    const list = await fetchPlayers(supabase, team.id);
    setPlayers(list);
    void refreshPhotoUrls(list);
    return list;
  }, [supabase, team.id, refreshPhotoUrls]);

  const loadLineup = useCallback(async () => {
    let id = lineupIdRef.current;
    if (!id) {
      const lineup = await fetchActiveLineup(supabase, team.id);
      id = lineup?.id ?? null;
      lineupIdRef.current = id;
      setLineupId(id);
    }
    if (!id) {
      setServerLineup(EMPTY_LINEUP);
      return;
    }
    // Während Umstellungen laufen, wird erst nach Abschluss der Warteschlange abgeglichen.
    if (pendingCountRef.current > 0) {
      lineupStaleRef.current = true;
      return;
    }
    const state = await fetchLineupState(supabase, id);
    if (pendingCountRef.current > 0) {
      lineupStaleRef.current = true;
      return;
    }
    setServerLineup(state);
  }, [supabase, team.id]);

  const reload = useCallback(async () => {
    try {
      await Promise.all([loadPlayers(), loadLineup()]);
      setStatus("ready");
      setLoadError(null);
    } catch (error) {
      setLoadError(toUserMessage(error, "Die Mannschaftsdaten konnten nicht geladen werden."));
      setStatus((s) => (s === "ready" ? s : "error"));
      if (status === "ready") toast.error(toUserMessage(error, "Aktualisierung fehlgeschlagen."));
    }
  }, [loadPlayers, loadLineup, status]);

  const reloadRef = useRef(reload);
  useEffect(() => {
    reloadRef.current = reload;
  }, [reload]);

  useEffect(() => {
    void reloadRef.current();
  }, []);

  // Signierte Foto-URLs regelmäßig erneuern, bevor sie ablaufen.
  const playersRef = useRef(players);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);
  useEffect(() => {
    const timer = window.setInterval(() => void refreshPhotoUrls(playersRef.current), SIGNED_URL_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refreshPhotoUrls]);

  // -------------------------------------------------------------------------
  // Realtime + Abgleich bei Fokus/Verbindung
  // -------------------------------------------------------------------------
  useEffect(() => {
    let playersTimer: number | undefined;
    let lineupTimer: number | undefined;
    const schedulePlayers = () => {
      window.clearTimeout(playersTimer);
      playersTimer = window.setTimeout(() => void loadPlayers().catch(() => undefined), 250);
    };
    const scheduleLineup = () => {
      window.clearTimeout(lineupTimer);
      lineupTimer = window.setTimeout(() => void loadLineup().catch(() => undefined), 250);
    };

    const channel = supabase
      .channel(`team-${team.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `team_id=eq.${team.id}` }, schedulePlayers)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "players" }, schedulePlayers)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lineup_positions", filter: `team_id=eq.${team.id}` },
        scheduleLineup,
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "lineup_positions" }, scheduleLineup)
      .subscribe();

    const resync = () => {
      if (document.visibilityState === "visible") {
        schedulePlayers();
        scheduleLineup();
      }
    };
    document.addEventListener("visibilitychange", resync);
    window.addEventListener("online", resync);

    return () => {
      window.clearTimeout(playersTimer);
      window.clearTimeout(lineupTimer);
      document.removeEventListener("visibilitychange", resync);
      window.removeEventListener("online", resync);
      void supabase.removeChannel(channel);
    };
  }, [supabase, team.id, loadPlayers, loadLineup]);

  // -------------------------------------------------------------------------
  // Abgeleitete Daten
  // -------------------------------------------------------------------------
  const playersById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const lineup = useMemo(() => {
    const optimistic = pending.reduce((state, op) => applyMove(state, op.command), serverLineup);
    // Gelöschte Spieler (z. B. von einem anderen Gerät) nie als Geister anzeigen.
    return status === "ready" ? pruneUnknownPlayers(optimistic, new Set(playersById.keys())) : optimistic;
  }, [pending, serverLineup, playersById, status]);

  const locate = useCallback((playerId: string) => locatePlayer(lineup, playerId), [lineup]);

  const photoUrl = useCallback(
    (player: Pick<PlayerRow, "photo_path"> | null | undefined) =>
      player?.photo_path ? (photoUrls[player.photo_path] ?? null) : null,
    [photoUrls],
  );

  // -------------------------------------------------------------------------
  // Aufstellung ändern: optimistisch, strikt nacheinander, Rollback durch Server-Abgleich
  // -------------------------------------------------------------------------
  const movePlayer = useCallback(
    (command: MoveCommand): Promise<boolean> => {
      const id = lineupIdRef.current;
      if (!id) {
        toast.error("Es ist keine aktive Aufstellung vorhanden.");
        return Promise.resolve(false);
      }
      const op: PendingMove = { id: ++moveSeqRef.current, command };
      pendingCountRef.current += 1;
      setPending((list) => [...list, op]);

      const run = queueRef.current.then(async () => {
        let ok = true;
        try {
          await movePlayerRpc(supabase, id, command);
        } catch (error) {
          ok = false;
          toast.error(toUserMessage(error, "Die Umstellung konnte nicht gespeichert werden."), {
            description: "Die Aufstellung wurde auf den gespeicherten Stand zurückgesetzt.",
          });
        }
        pendingCountRef.current -= 1;
        if (pendingCountRef.current === 0) {
          // Warteschlange leer: maßgeblichen Stand vom Server holen, dann Optimismus auflösen.
          try {
            const state = await fetchLineupState(supabase, id);
            if (pendingCountRef.current === 0) {
              setServerLineup(state);
              setPending([]);
              lineupStaleRef.current = false;
            }
          } catch (error) {
            toast.error(toUserMessage(error, "Die Aufstellung konnte nicht abgeglichen werden."));
            if (pendingCountRef.current === 0) setPending([]);
          }
        }
        return ok;
      });
      queueRef.current = run.catch(() => undefined);
      return run;
    },
    [supabase],
  );

  // -------------------------------------------------------------------------
  // Spieler
  // -------------------------------------------------------------------------
  const upsertLocal = useCallback(
    (row: PlayerRow) => {
      setPlayers((list) => {
        const exists = list.some((p) => p.id === row.id);
        return exists ? list.map((p) => (p.id === row.id ? row : p)) : [...list, row];
      });
      if (row.photo_path) {
        void createSignedPhotoUrls(supabase, [row.photo_path])
          .then((urls) => setPhotoUrls((current) => ({ ...current, ...urls })))
          .catch(() => undefined);
      }
    },
    [supabase],
  );

  const applyPhotoChange = useCallback(
    async (row: PlayerRow, photo: PhotoChange): Promise<PlayerRow> => {
      if (photo.kind === "keep") return row;
      const oldPath = row.photo_path;
      if (photo.kind === "remove") {
        if (!oldPath) return row;
        const updated = await updatePlayerRow(supabase, row.id, { photo_path: null });
        await removePhotoFiles(supabase, [oldPath]).catch(() => undefined);
        return updated;
      }
      const blob = await prepareImage(photo.file);
      const newPath = await uploadPlayerPhoto(supabase, team.id, row.id, blob);
      let updated: PlayerRow;
      try {
        updated = await updatePlayerRow(supabase, row.id, { photo_path: newPath });
      } catch (error) {
        await removePhotoFiles(supabase, [newPath]).catch(() => undefined);
        throw error;
      }
      if (oldPath) await removePhotoFiles(supabase, [oldPath]).catch(() => undefined);
      return updated;
    },
    [supabase, team.id],
  );

  const createPlayer = useCallback(
    async (values: PlayerFormValues, photo: PhotoChange) => {
      const row = await insertPlayer(supabase, { ...toPlayerPayload(values), team_id: team.id });
      upsertLocal(row);
      if (photo.kind !== "replace") return row;
      try {
        const withPhoto = await applyPhotoChange(row, photo);
        upsertLocal(withPhoto);
        return withPhoto;
      } catch (error) {
        toast.warning("Spieler gespeichert – das Foto konnte jedoch nicht hochgeladen werden.", {
          description: toUserMessage(error, "Bitte das Foto im Profil erneut hochladen."),
        });
        return row;
      }
    },
    [supabase, team.id, upsertLocal, applyPhotoChange],
  );

  const updatePlayer = useCallback(
    async (playerId: string, values: PlayerFormValues, photo: PhotoChange) => {
      const row = await updatePlayerRow(supabase, playerId, toPlayerPayload(values));
      upsertLocal(row);
      if (photo.kind === "keep") return row;
      try {
        const withPhoto = await applyPhotoChange(row, photo);
        upsertLocal(withPhoto);
        return withPhoto;
      } catch (error) {
        toast.warning("Änderungen gespeichert – das Foto konnte jedoch nicht aktualisiert werden.", {
          description: toUserMessage(error, "Bitte erneut versuchen."),
        });
        return row;
      }
    },
    [supabase, upsertLocal, applyPhotoChange],
  );

  const updateMotivation = useCallback(
    async (playerId: string, motivationStatus: MotivationStatus, note: string) => {
      const row = await updatePlayerRow(supabase, playerId, {
        motivation_status: motivationStatus,
        motivation_note: note.trim() === "" ? null : note.trim(),
      });
      upsertLocal(row);
      return row;
    },
    [supabase, upsertLocal],
  );

  const changePhoto = useCallback(
    async (playerId: string, photo: PhotoChange) => {
      const current = playersById.get(playerId);
      if (!current) throw Object.assign(new Error("player_not_found"), { code: "P0002" });
      const row = await applyPhotoChange(current, photo);
      upsertLocal(row);
      return row;
    },
    [playersById, applyPhotoChange, upsertLocal],
  );

  const deletePlayer = useCallback(
    async (playerId: string) => {
      await deletePlayerRow(supabase, playerId);
      setPlayers((list) => list.filter((p) => p.id !== playerId));
      setServerLineup((state) => applyMove(state, { playerId, target: "NONE" }));
      await removeAllPlayerPhotos(supabase, team.id, playerId).catch(() => undefined);
    },
    [supabase, team.id],
  );

  const setTeamName = useCallback((name: string) => setTeam((t) => ({ ...t, name })), []);

  const value = useMemo<TeamDataContextValue>(
    () => ({
      team,
      currentUserId,
      canEdit,
      status,
      loadError,
      players,
      playersById,
      lineupId,
      lineup,
      isSyncing: pending.length > 0,
      photoUrl,
      locate,
      reload,
      setTeamName,
      movePlayer,
      createPlayer,
      updatePlayer,
      updateMotivation,
      changePhoto,
      deletePlayer,
    }),
    [
      team,
      currentUserId,
      canEdit,
      status,
      loadError,
      players,
      playersById,
      lineupId,
      lineup,
      pending.length,
      photoUrl,
      locate,
      reload,
      setTeamName,
      movePlayer,
      createPlayer,
      updatePlayer,
      updateMotivation,
      changePhoto,
      deletePlayer,
    ],
  );

  return <TeamDataContext value={value}>{children}</TeamDataContext>;
}

export function useTeamData(): TeamDataContextValue {
  const ctx = useContext(TeamDataContext);
  if (!ctx) throw new Error("useTeamData muss innerhalb von TeamDataProvider verwendet werden.");
  return ctx;
}
