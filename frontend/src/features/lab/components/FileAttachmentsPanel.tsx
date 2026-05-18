import { useRef, useState } from 'react';
import { FileText, ImageIcon, Trash2, Upload, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { labApi } from '@/services/labReport.service';
import { getErrorMessage } from '@/lib/utils';

interface Props {
  reportId: string;
  fileUrls: string[];
  onChange: (updatedUrls: string[]) => void;
  readOnly?: boolean;
}

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function isImage(url: string) {
  const ext = url.split('.').pop()?.toLowerCase() ?? '';
  return IMAGE_EXTS.has(`.${ext}`);
}

function fileName(url: string) {
  return url.split('/').pop() ?? url;
}

export function FileAttachmentsPanel({ reportId, fileUrls, onChange, readOnly }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!inputRef.current) return;
    inputRef.current.value = '';
    if (!file) return;

    setUploadErr('');
    setUploading(true);
    try {
      const res = await labApi.uploadFile(reportId, file);
      onChange(res.data.data.fileUrls);
    } catch (err) {
      setUploadErr(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (url: string) => {
    setDeletingUrl(url);
    try {
      const res = await labApi.deleteFile(reportId, url);
      onChange(res.data.data.fileUrls);
    } catch (err) {
      setUploadErr(getErrorMessage(err));
    } finally {
      setDeletingUrl(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Attachments</h3>
        {!readOnly && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              isLoading={uploading}
              disabled={uploading || fileUrls.length >= 5}
            >
              {!uploading && <Upload className="h-3.5 w-3.5 mr-1" />}
              Upload File
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </>
        )}
      </div>

      {uploadErr && <Alert variant="error">{uploadErr}</Alert>}

      {fileUrls.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">No files attached.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {fileUrls.map((url) => {
            const isImg = isImage(url);
            const name = fileName(url);
            const isDeleting = deletingUrl === url;

            return (
              <li key={url} className="flex items-center gap-3 px-3 py-2 bg-white hover:bg-accent/30 transition-colors">
                {/* Thumbnail or icon */}
                {isImg ? (
                  <img
                    src={url}
                    alt={name}
                    className="h-10 w-10 rounded object-cover flex-shrink-0 border border-border"
                  />
                ) : (
                  <div className="h-10 w-10 rounded flex items-center justify-center flex-shrink-0 bg-red-50 border border-red-100">
                    <FileText className="h-5 w-5 text-red-500" />
                  </div>
                )}

                {/* Name + type */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{name}</p>
                  <p className="text-[11px] text-muted-foreground">{isImg ? 'Image' : 'PDF'}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-7 w-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    title="Open"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>

                  {!readOnly && (
                    <button
                      onClick={() => handleDelete(url)}
                      disabled={isDeleting}
                      className="h-7 w-7 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                      title="Delete"
                    >
                      {isDeleting ? (
                        <Spinner size="sm" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!readOnly && fileUrls.length >= 5 && (
        <p className="text-xs text-muted-foreground">Maximum 5 files per report.</p>
      )}
    </div>
  );
}
