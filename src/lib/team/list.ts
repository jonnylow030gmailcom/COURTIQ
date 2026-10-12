import { calculateAge } from "@/lib/domain/format";
import { MOTIVATION, type MotivationStatus } from "@/lib/domain/motivation";
import { isFieldPositionCode, POSITION_SORT_ORDER, type FieldPositionCode } from "@/lib/domain/positions";
import type { PlayerLocation } from "@/lib/lineup/logic";
import type { PlayerRow } from "@/types/database";

export type SortKey = "name" | "age" | "position" | "motivation";
export type SortDir = "asc" | "desc";

export interface TeamListFilter {
  query: string;
  position: FieldPositionCode | "all";
  motivation: MotivationStatus | "all";
}

export interface TeamListRow {
  player: PlayerRow;
  age: number | null;
  location: PlayerLocation;
}

function normalize(value: string) {
  return value.toLocaleLowerCase("de-DE").normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export function filterAndSortPlayers(
  players: PlayerRow[],
  locate: (id: string) => PlayerLocation,
  filter: TeamListFilter,
  sort: { key: SortKey; dir: SortDir },
  today: Date = new Date(),
): TeamListRow[] {
  const q = normalize(filter.query.trim());
  const rows = players
    .filter((p) => {
      if (q && !normalize(`${p.first_name} ${p.last_name}`).includes(q) && !normalize(`${p.last_name} ${p.first_name}`).includes(q)) {
        return false;
      }
      if (filter.position !== "all" && p.primary_position !== filter.position && !p.alternative_positions.includes(filter.position)) {
        return false;
      }
      if (filter.motivation !== "all" && p.motivation_status !== filter.motivation) return false;
      return true;
    })
    .map((player) => ({ player, age: calculateAge(player.birth_date, today), location: locate(player.id) }));

  const byName = (a: TeamListRow, b: TeamListRow) =>
    a.player.last_name.localeCompare(b.player.last_name, "de") || a.player.first_name.localeCompare(b.player.first_name, "de");
  const factor = sort.dir === "asc" ? 1 : -1;

  rows.sort((a, b) => {
    let result = 0;
    switch (sort.key) {
      case "name":
        result = byName(a, b);
        break;
      case "age":
        // Ohne Geburtsdatum immer ans Ende
        if (a.age === null && b.age === null) result = 0;
        else if (a.age === null) return 1;
        else if (b.age === null) return -1;
        else result = a.age - b.age;
        break;
      case "position": {
        const pa = isFieldPositionCode(a.player.primary_position) ? POSITION_SORT_ORDER[a.player.primary_position] : 99;
        const pb = isFieldPositionCode(b.player.primary_position) ? POSITION_SORT_ORDER[b.player.primary_position] : 99;
        result = pa - pb;
        break;
      }
      case "motivation":
        result =
          MOTIVATION[a.player.motivation_status as MotivationStatus].rank -
          MOTIVATION[b.player.motivation_status as MotivationStatus].rank;
        break;
    }
    return result * factor || byName(a, b);
  });

  return rows;
}
