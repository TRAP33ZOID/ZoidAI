"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Database } from "lucide-react";
import { toast } from "sonner";
import { documentRefreshEmitter } from "@/lib/document-context";
import { getLanguageConfig } from "@/lib/language";

interface Document {
  id: number;
  filename: string;
  language: string;
  preview: string;
  created_at: string;
}

export function DocumentList() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Subscribe to document refresh events from IngestionForm
  useEffect(() => {
    const unsubscribe = documentRefreshEmitter.subscribe(() => {
      console.log("📄 [DOCUMENT-LIST] Refresh event received, fetching documents...");
      fetchDocuments();
    });
    return unsubscribe;
  }, []);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      
      if (res.ok) {
        setDocuments(data.documents);
      } else {
        toast.error("Failed to load documents");
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Error loading documents");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this document? This cannot be undone.")) {
      return;
    }

    setIsDeletingId(id);
    try {
      const res = await fetch(`/api/documents?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setDocuments((prev) => prev.filter((doc) => doc.id !== id));
        toast.success("Document deleted successfully");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete document");
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Error deleting document");
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Knowledge Base Documents ({documents.length})
        </CardTitle>
        <CardDescription>Manage your knowledge base documents</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-gray-500">Loading documents...</p>
        ) : documents.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No documents uploaded yet. Upload documents above to get started.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">Filename</th>
                  <th className="text-left py-3 px-4 font-semibold">Language</th>
                  <th className="text-left py-3 px-4 font-semibold">Preview</th>
                  <th className="text-left py-3 px-4 font-semibold">Date</th>
                  <th className="text-left py-3 px-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className="border-b hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-medium">{doc.filename}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        {getLanguageConfig(doc.language).name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-xs max-w-xs truncate">
                      {doc.preview}
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-xs">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(doc.id)}
                        disabled={isDeletingId === doc.id}
                      >
                        {isDeletingId === doc.id ? (
                          "Deleting..."
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}