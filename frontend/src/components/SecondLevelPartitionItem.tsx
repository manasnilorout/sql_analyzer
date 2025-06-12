// src/components/SecondLevelPartitionItem.tsx
"use client";

import * as React from "react";
import type { SharedSecondLevelPartition } from "@shared/types/analysis";
import { CodeBlock } from "@/components/code-block";
import SummaryDisplay from "@/components/SummaryDisplay";
import DetailedExplanationDisplay from "@/components/DetailedExplanationDisplay";
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
import { Badge } from "@/components/ui/badge";
import { Lightbulb, BookOpenText, FileCode, Sigma } from "lucide-react";

interface SecondLevelPartitionItemProps {
  partition: SharedSecondLevelPartition;
  itemValue: string; // Unique value for AccordionItem
}

const SecondLevelPartitionItem: React.FC<SecondLevelPartitionItemProps> = ({ partition, itemValue }) => {
  return (
    <Card className="mb-4 shadow-md border-border/60 hover:shadow-lg transition-shadow duration-200 ease-in-out bg-card">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-lg text-primary flex items-center justify-between">
          {partition.blockTitle || 'Sub-Block'}
          <Badge variant="secondary" className="ml-2 text-md">{partition.blockType || partition.type}</Badge>
        </CardTitle>
        {partition.blockComplexity && (
          <CardDescription className="text-xs text-muted-foreground mt-1">Complexity: {partition.blockComplexity}</CardDescription>
        )}
        {partition.startLine !== undefined && partition.endLine !== undefined && (
           <CardDescription className="text-xs text-muted-foreground mt-1">
             Lines: {partition.startLine} - {partition.endLine} (approx.)
           </CardDescription>
        )}
        {partition.executionOrder !== undefined && (
          <CardDescription className="text-xs text-muted-foreground mt-1">Order: {partition.executionOrder}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <Accordion type="multiple" className="w-full space-y-3">
          <AccordionItem value={`${itemValue}-code`} className="border rounded-md shadow-sm bg-muted/30 hover:bg-muted/50 transition-colors">
            <AccordionTrigger className="px-4 py-2 text-sm font-semibold hover:no-underline text-foreground flex items-center gap-2">
              <FileCode size={16} className="text-primary/80" /> View Code
            </AccordionTrigger>
          <AccordionContent className="p-2 border-t border-border/50">
            <CodeBlock code={partition.code} className="text-xs max-h-[300px]" />
            {partition.blockDependencies && partition.blockDependencies.length > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                Depends on: {partition.blockDependencies.join(', ')}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

          <AccordionItem value={`${itemValue}-summary`} className="border rounded-md shadow-sm bg-muted/30 hover:bg-muted/50 transition-colors">
            <AccordionTrigger className="px-4 py-2 text-sm font-semibold hover:no-underline text-foreground flex items-center gap-2">
             <Lightbulb size={16} className="text-primary/80" /> AI Summary
            </AccordionTrigger>
            <AccordionContent className="p-3 border-t border-border/50">
              <SummaryDisplay summary={partition.summary} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value={`${itemValue}-explanation`} className="border rounded-md shadow-sm bg-muted/30 hover:bg-muted/50 transition-colors">
            <AccordionTrigger className="px-4 py-2 text-sm font-semibold hover:no-underline text-foreground flex items-center gap-2">
              <BookOpenText size={16} className="text-primary/80" /> AI Detailed Explanation
            </AccordionTrigger>
            <AccordionContent className="p-3 border-t border-border/50">
              <DetailedExplanationDisplay explanation={partition.detailedExplanation} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default SecondLevelPartitionItem;
