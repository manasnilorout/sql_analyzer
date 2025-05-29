import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  className?: string;
}

export function CodeBlock({ code, className }: CodeBlockProps) {
  return (
    <pre
      className={cn(
        "p-4 rounded-md bg-muted text-muted-foreground overflow-x-auto text-sm max-h-[600px]",
        "shadow-inner", 
        className
      )}
    >
      <code className="font-mono">{code}</code>
    </pre>
  );
}
