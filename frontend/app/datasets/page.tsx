'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useCompilationStore } from '@/stores/compilation-store';
import type { Dataset } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Trash2, Download, FileSpreadsheet, Loader2 } from 'lucide-react';

export default function DatasetsPage() {
  const { isAuthenticated } = useAuthStore();
  const {
    datasets,
    isLoadingDatasets,
    loadDatasets,
    deleteDataset,
    uploadDataset,
  } = useCompilationStore();

  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadDatasets();
    }
  }, [isAuthenticated, loadDatasets]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      alert('Only CSV files are allowed');
      return;
    }

    // Validate file size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      alert('File size exceeds 100MB limit');
      return;
    }

    setUploading(true);
    try {
      await uploadDataset(file);
    } catch (error) {
      console.error('Failed to upload dataset:', error);
      alert('Failed to upload dataset');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this dataset?')) return;

    setDeleting(id);
    try {
      await deleteDataset(id);
    } catch (error) {
      console.error('Failed to delete dataset:', error);
      alert('Failed to delete dataset');
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = async (dataset: Dataset) => {
    if (dataset.download_url) {
      window.open(dataset.download_url, '_blank');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Authentication Required</h1>
          <p className="text-muted-foreground mt-2">
            Please sign in to manage your datasets.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">My Datasets</h1>
          <p className="text-muted-foreground">
            Upload CSV files to use in your notebooks
          </p>
        </div>
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Dataset
            </>
          )}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {isLoadingDatasets ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : datasets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No datasets yet</h3>
            <p className="text-muted-foreground mb-4">
              Upload your first CSV dataset to get started
            </p>
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Dataset
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {datasets.map((dataset) => (
            <Card key={dataset.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-8 w-8 text-green-500" />
                    <div>
                      <CardTitle className="text-base">
                        {dataset.original_filename}
                      </CardTitle>
                      <CardDescription>
                        {dataset.row_count} rows • {formatFileSize(dataset.file_size_bytes)}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(dataset)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(dataset.id)}
                      disabled={deleting === dataset.id}
                    >
                      {deleting === dataset.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
