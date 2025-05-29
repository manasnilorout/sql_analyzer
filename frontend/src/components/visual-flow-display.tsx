
// src/components/visual-flow-display.tsx
"use client";

import type { GenerateSqlLogicalFlowOutput, LogicalStep } from "@/ai/flows/generate-sql-logical-flow";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/code-block";
import { ArrowDown, BoxSelect, Shuffle, Filter, Link2, DatabaseZap, Sigma, SortAsc, PencilLine, Binary, Share2, ListTree, ArrowRightLeft, LayoutPanelTop, CornerDownRight, Terminal, AlertCircle } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

interface VisualFlowDisplayProps {
  flowData: GenerateSqlLogicalFlowOutput;
}

interface StepTypeStyle {
  borderColorClass: string;
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
  iconClassName: string;
}

const getStepTypeStyles = (type: LogicalStep['type']): StepTypeStyle => {
  switch (type) {
    case "DataRetrieval":
    case "CTEInitialization":
    case "CTEConsumption":
    case "Output":
      return { borderColorClass: "border-l-primary", badgeVariant: "default", iconClassName: "text-primary" };
    case "Filtering":
    case "Joining":
    case "Transformation":
    case "Aggregation":
    case "Sorting":
    case "SubqueryExecution":
    case "WindowFunction":
    case "SetOperation":
    case "ConditionalLogic":
    case "VariableAssignment":
      return { borderColorClass: "border-l-accent", badgeVariant: "secondary", iconClassName: "text-accent-foreground bg-accent p-0.5 rounded-sm" };
    case "Modification":
      return { borderColorClass: "border-l-destructive", badgeVariant: "destructive", iconClassName: "text-destructive" };
    default: // Other
      return { borderColorClass: "border-l-muted-foreground", badgeVariant: "outline", iconClassName: "text-muted-foreground" };
  }
};

const getIconForStepType = (type: LogicalStep['type'], className?: string): React.ReactNode => {
  const LIcon = (() => {
    switch (type) {
      case "DataRetrieval": return DatabaseZap;
      case "Filtering": return Filter;
      case "Joining": return Link2;
      case "Transformation": return Shuffle;
      case "Aggregation": return Sigma;
      case "Sorting": return SortAsc;
      case "Modification": return PencilLine;
      case "CTEInitialization": return Share2;
      case "CTEConsumption": return CornerDownRight;
      case "SubqueryExecution": return BoxSelect;
      case "SetOperation": return ArrowRightLeft;
      case "WindowFunction": return LayoutPanelTop;
      case "ConditionalLogic": return ListTree;
      case "VariableAssignment": return Binary;
      case "Output": return Terminal;
      default: return AlertCircle;
    }
  })();
  return <LIcon size={18} className={className} />;
};


export function VisualFlowDisplay({ flowData }: VisualFlowDisplayProps) {
  if (!flowData || !flowData.flowSteps || flowData.flowSteps.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-primary">Logical Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No logical flow steps were generated for this SQL code.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-0"> {/* Reduced space between card and connector */}
      {flowData.flowSteps.map((step, index) => {
        const stepStyles = getStepTypeStyles(step.type);
        return (
          <React.Fragment key={step.id}>
            <Card className={cn(
              "shadow-md hover:shadow-lg transition-shadow duration-200 ease-in-out border-l-4 rounded-r-lg rounded-l-none", // Ensure border is visible
              stepStyles.borderColorClass
            )}>
              <CardHeader className="pb-3 pt-4 px-4">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-md font-semibold text-primary flex items-center">
                    {getIconForStepType(step.type, cn("mr-2", stepStyles.iconClassName))}
                    {step.title}
                  </CardTitle>
                  <Badge variant={stepStyles.badgeVariant} className="ml-2 text-xs whitespace-nowrap">
                    {step.type}
                  </Badge>
                </div>
                {step.sqlReference && (
                  <CardDescription className="mt-1">
                    <CodeBlock code={step.sqlReference} className="text-xs p-1.5 mt-1 max-h-[75px] bg-muted/50" />
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-sm text-foreground/80 leading-relaxed">{step.description}</p>
              </CardContent>
            </Card>
            {index < flowData.flowSteps.length - 1 && (
              <div className="flex justify-center items-center h-10 my-0"> {/* Connector container */}
                <div className="flex flex-col items-center h-full">
                  <div className="w-px flex-grow bg-border"></div> {/* Line part */}
                  <ArrowDown className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="w-px flex-grow bg-border"></div> {/* Line part */}
                </div>
              </div>
            )}
          </React.Fragment>
        )
      })}
    </div>
  );
}
