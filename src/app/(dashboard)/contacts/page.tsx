"use client";

import { useState, useEffect, useCallback } from "react";
import { UserPlus, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Topbar } from "@/components/layout/Topbar";
import { ContactsTable } from "@/components/contacts/ContactsTable";
import { ContactForm } from "@/components/contacts/ContactForm";
import { CSVImport } from "@/components/contacts/CSVImport";
import { useAppStore } from "@/store/app.store";
import type { Contact } from "@/types";

export default function ContactsPage() {
  const { setSidebarOpen } = useAppStore();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [contactFormOpen, setContactFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Contact | null>(null);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contacts?page=${p}&limit=50`);
      const data = await res.json();
      setContacts(data.contacts ?? []);
      setTotal(data.total ?? 0);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function exportCSV() {
    const headers = ["Phone", "Name", "Tags", "Opted Out", "Created At"];
    const rows = contacts.map((c) => [
      c.phone,
      c.name ?? "",
      c.tags.join(";"),
      c.optedOut ? "Yes" : "No",
      new Date(c.createdAt).toISOString(),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contacts_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title="Contacts"
        description={`${total.toLocaleString()} total contacts`}
        onMenuClick={() => setSidebarOpen(true)}
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              className="hidden sm:flex gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportOpen(true)}
              className="gap-1.5"
            >
              <Upload className="h-3.5 w-3.5" />
              Import CSV
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-[#25D366] hover:bg-[#128C7E] text-white"
              onClick={() => {
                setEditTarget(null);
                setContactFormOpen(true);
              }}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add Contact
            </Button>
          </div>
        }
      />

      <ScrollArea className="flex-1">
        <div className="p-4 lg:p-6">
          <ContactsTable
            contacts={contacts}
            onEdit={(c) => {
              setEditTarget(c as Contact);
              setContactFormOpen(true);
            }}
            onRefresh={() => load(page)}
          />
        </div>
      </ScrollArea>

      {/* Add / Edit contact dialog */}
      <ContactForm
        contact={editTarget ?? undefined}
        open={contactFormOpen}
        onClose={() => {
          setContactFormOpen(false);
          setEditTarget(null);
        }}
        onSuccess={() => load(1)}
      />

      {/* CSV import dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Import Contacts from CSV</DialogTitle>
          </DialogHeader>
          <CSVImport
            onSuccess={(count) => {
              setImportOpen(false);
              load(1);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
