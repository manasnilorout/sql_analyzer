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
import { Lightbulb, BookOpenText, FileCode, Sigma, Info, Target, GitBranch, BarChart3, Calendar, Hash } from "lucide-react";

interface SecondLevelPartitionItemProps {
  partition: SharedSecondLevelPartition;
  itemValue: string; // Unique value for AccordionItem
}

const SecondLevelPartitionItem: React.FC<SecondLevelPartitionItemProps> = ({ partition, itemValue }) => {
  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'complex': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getBlockTypeColor = (type: string) => {
    const colors = {
      'declaration': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'initialization': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'business_logic': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      'transaction': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'loop': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      'conditional': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
      'error_handling': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'data_operation': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
      'calculation': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
      'cleanup': 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  return (
    <Card className="mb-4 shadow-md border-border/60 hover:shadow-lg transition-shadow duration-200 ease-in-out bg-card">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-lg text-primary flex items-center justify-between">
          {partition.blockTitle || 'SQL Sub-Block'}
          <div className="flex gap-2">
            <Badge className={getBlockTypeColor(partition.type)}>{partition.type}</Badge>
            {partition.blockComplexity && (
              <Badge className={getComplexityColor(partition.blockComplexity)}>
                {partition.blockComplexity}
              </Badge>
            )}
          </div>
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground mt-2">
          {partition.blockExplanation}
        </CardDescription>
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          {(partition.blockLineStart && partition.blockLineEnd) && (
            <span className="flex items-center gap-1">
              <Hash size={12} />
              Lines: {partition.blockLineStart} - {partition.blockLineEnd}
            </span>
          )}
          {partition.executionOrder && (
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              Order: {partition.executionOrder}
            </span>
          )}
          {partition.businessPurpose && (
            <span className="flex items-center gap-1">
              <Target size={12} />
              {partition.businessPurpose}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <Accordion type="multiple" className="w-full space-y-3">
          <AccordionItem value={`${itemValue}-code`} className="border rounded-md shadow-sm bg-muted/30 hover:bg-muted/50 transition-colors">
            <AccordionTrigger className="px-4 py-2 text-sm font-semibold hover:no-underline text-foreground flex items-center gap-2">
              <FileCode size={16} className="text-primary/80" /> View Code
            </AccordionTrigger>
            <AccordionContent className="p-2 border-t border-border/50">
              <CodeBlock code={partition.code} className="text-xs max-h-[300px]" />
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

          {partition.blockDependencies && partition.blockDependencies.length > 0 && (
            <AccordionItem value={`${itemValue}-dependencies`} className="border rounded-md shadow-sm bg-muted/30 hover:bg-muted/50 transition-colors">
              <AccordionTrigger className="px-4 py-2 text-sm font-semibold hover:no-underline text-foreground flex items-center gap-2">
                <GitBranch size={16} className="text-primary/80" /> Dependencies
              </AccordionTrigger>
              <AccordionContent className="p-3 border-t border-border/50">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-2">This block depends on:</p>
                  <div className="flex flex-wrap gap-2">
                    {partition.blockDependencies.map((dep, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {dep}
                      </Badge>
                    ))}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {partition.tableInfo && (
            <AccordionItem value={`${itemValue}-tables`} className="border rounded-md shadow-sm bg-muted/30 hover:bg-muted/50 transition-colors">
              <AccordionTrigger className="px-4 py-2 text-sm font-semibold hover:no-underline text-foreground flex items-center gap-2">
                <BarChart3 size={16} className="text-primary/80" /> Table Analysis
              </AccordionTrigger>
              <AccordionContent className="p-3 border-t border-border/50">
                <div className="space-y-2">
                  {partition.tableInfo.tablesUsed && partition.tableInfo.tablesUsed.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Tables Used:</h4>
                      <div className="flex flex-wrap gap-2">
                        {partition.tableInfo.tablesUsed.map((table, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {table.tableName}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {partition.tableInfo.relationships && partition.tableInfo.relationships.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Relationships:</h4>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {partition.tableInfo.relationships.map((rel, index) => (
                          <li key={index}>• {rel.relationshipType}: {rel.description}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {partition.logicalFlowSteps && partition.logicalFlowSteps.steps && partition.logicalFlowSteps.steps.length > 0 && (
            <AccordionItem value={`${itemValue}-flow`} className="border rounded-md shadow-sm bg-muted/30 hover:bg-muted/50 transition-colors">
              <AccordionTrigger className="px-4 py-2 text-sm font-semibold hover:no-underline text-foreground flex items-center gap-2">
                <Sigma size={16} className="text-primary/80" /> Logical Flow
              </AccordionTrigger>
              <AccordionContent className="p-3 border-t border-border/50">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-2">Execution flow:</p>
                  <ol className="text-xs space-y-1">
                    {partition.logicalFlowSteps.steps.map((step, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <div>
                          <div className="font-medium">{step.stepType}</div>
                          <div className="text-muted-foreground">{step.description}</div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {partition.parentBlockContext && (
            <AccordionItem value={`${itemValue}-context`} className="border rounded-md shadow-sm bg-muted/30 hover:bg-muted/50 transition-colors">
              <AccordionTrigger className="px-4 py-2 text-sm font-semibold hover:no-underline text-foreground flex items-center gap-2">
                <Info size={16} className="text-primary/80" /> Context Info
              </AccordionTrigger>
              <AccordionContent className="p-3 border-t border-border/50">
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-medium">Parent Block:</span> {partition.parentBlockContext}
                  </div>
                  {partition.hasNestedBlocks && (
                    <div>
                      <span className="font-medium">Contains nested blocks:</span> Yes
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default SecondLevelPartitionItem;
