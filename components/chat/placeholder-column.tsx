import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

interface PlaceholderColumnProps {
  title: string;
  colorClass: string;
  foregroundClass: string;
}

export function PlaceholderColumn({ title, colorClass, foregroundClass }: PlaceholderColumnProps) {
  return (
    <Card className="opacity-50">
      <CardHeader className={`${colorClass} ${foregroundClass}`}>
        <h3 className="text-center font-semibold">{title}</h3>
      </CardHeader>
      <CardContent className="flex min-h-[500px] flex-col items-center justify-center p-6 text-center">
        <Lock className="mb-4 h-16 w-16 text-muted-foreground" />
        <p className="mb-2 font-semibold text-muted-foreground">
          API Key Not Configured
        </p>
        <p className="mb-4 max-w-xs text-sm text-muted-foreground">
          Add your {title} API key to enable consensus across multiple models
        </p>
        <Button variant="secondary" asChild>
          <Link href="/settings">Add {title} Key</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
