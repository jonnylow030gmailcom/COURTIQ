import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { CourtBoard } from "@/components/court/court-board";

export const metadata: Metadata = { title: "Spielfeld" };

export default function SpielfeldPage() {
  return (
    <>
      <PageHeader
        eyebrow="Aufstellung"
        title="Spielfeld"
        description="Sieben Startpositionen und eine flexible Ersatzbank. Änderungen werden sofort gespeichert und auf allen Geräten aktualisiert."
      />
      <CourtBoard />
    </>
  );
}
