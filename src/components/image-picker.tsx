import { ImagePlus, X } from "lucide-react";

export function ImagePicker({ files, onChange }: { files: File[]; onChange: (f: File[]) => void }) {
  return (
    <div className="space-y-2">
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted">
        <ImagePlus className="h-4 w-4" />
        Attach images
        <input
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? []).filter((f) => f.size <= 10 * 1024 * 1024);
            onChange([...files, ...picked].slice(0, 5));
            e.target.value = "";
          }}
        />
      </label>
      {files.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <li key={i} className="relative">
              <img src={URL.createObjectURL(f)} alt={f.name} className="h-16 w-16 rounded-xl object-cover" />
              <button
                type="button"
                aria-label={`Remove ${f.name}`}
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-foreground text-background"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
