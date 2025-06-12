// src/components/SummaryDisplay.tsx
"use client";

import * as React from "react";
import type { SharedSummarizeCodeBlockOutput } from "@shared/types/analysis";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CodeBlock } from "@/components/code-block";
import { MessageSquareQuote, ListOrdered, Workflow, Brain, Lightbulb, InfoIcon } from "lucide-react";

interface SummaryDisplayProps {
  summary: SharedSummarizeCodeBlockOutput | null | undefined;
}

const SummaryDisplay: React.FC<SummaryDisplayProps> = ({ summary }) => {
  if (!summary) {
    return (
      <Card className="border-border/40 shadow-sm bg-card">
        <CardHeader>
          <CardTitle className="text-lg text-muted-foreground">Summary Not Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">AI summary for this section could not be generated or is not applicable.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/40 shadow-sm bg-card">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-lg text-primary flex items-center gap-2"><MessageSquareQuote size={20} />Main Purpose</CardTitle>
        </CardHeader>
        <CardContent className="py-3 px-4">
          <p className="text-foreground leading-relaxed">{summary.mainPurpose}</p>
        </CardContent>
      </Card>

      {summary.keyOperations && summary.keyOperations.length > 0 && (
        <Card className="border-border/40 shadow-sm bg-card">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-lg text-primary flex items-center gap-2"><ListOrdered size={20} />Key Operations</CardTitle>
          </CardHeader>
          <CardContent className="py-3 px-4">
            <ul className="list-disc pl-5 space-y-1 text-foreground leading-relaxed">
              {summary.keyOperations.map((op, idx) => <li key={idx}>{op}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/40 shadow-sm bg-card">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-lg text-primary flex items-center gap-2"><Workflow size={20} />Data Flow</CardTitle>
        </CardHeader>
        <CardContent className="py-3 px-4">
          <p className="text-foreground leading-relaxed">{summary.dataFlow}</p>
        </CardContent>
      </Card>

      {summary.coreSqlConcepts && summary.coreSqlConcepts.length > 0 && (
        <Card className="border-border/40 shadow-sm bg-card">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-lg text-primary flex items-center gap-2"><Brain size={20} />Core SQL Concepts & Learning Points</CardTitle>
            <CardDescription className="text-muted-foreground text-sm">Key SQL techniques used, explained for learning.</CardDescription>
          </CardHeader>
          <CardContent className="py-3 px-4">
            <Accordion type="single" collapsible className="w-full">
              {summary.coreSqlConcepts.map((concept, idx) => (
                <AccordionItem value={`concept-${idx}`} key={idx} className="border-border/60 last:border-b-0">
                  <AccordionTrigger className="text-md font-semibold hover:no-underline text-left text-foreground">
                    {concept.concept}
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 space-y-2">
                    <p className="text-foreground/90 leading-relaxed">{concept.explanation}</p>
                    {concept.codeExample && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Example from code:</p>
                        <CodeBlock code={concept.codeExample} className="text-xs max-h-[100px] p-2 bg-muted/70" />
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {summary.businessLogicInsights && summary.businessLogicInsights.length > 0 && (
        <Card className="border-border/40 shadow-sm bg-card">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-lg text-primary flex items-center gap-2"><Lightbulb size={20} />Business Logic Insights</CardTitle>
          </CardHeader>
          <CardContent className="py-3 px-4">
            <ul className="list-disc pl-5 space-y-1 text-foreground leading-relaxed">
              {summary.businessLogicInsights.map((insight, idx) => <li key={idx}>{insight}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      {summary.beginnerFriendlyTips && summary.beginnerFriendlyTips.length > 0 && (
        <Card className="border-border/40 shadow-sm bg-card">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-lg text-primary flex items-center gap-2"><InfoIcon size={20} />Beginner Friendly Tips</CardTitle>
          </CardHeader>
          <CardContent className="py-3 px-4">
            <ul className="list-disc pl-5 space-y-1 text-foreground leading-relaxed">
              {summary.beginnerFriendlyTips.map((tip, idx) => <li key={idx}>{tip}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SummaryDisplay;
