// src/components/sql-analyzer-page.tsx
"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CodeBlock } from "@/components/code-block";
import { ApiClient, ApiError } from "@/lib/api-client";
import type { FullAnalysisPayload, AnalysisError, SingleAnalysisResult } from "@shared/types/analysis";
import type { ExplainSqlBlockOutput } from "@/ai/flows/explain-logic-rules";
import type { ExtractTableInfoOutput, IdentifiedTable } from "@/ai/flows/extract-table-info";
import type { SummarizeCodeBlockOutput } from "@/ai/flows/summarize-code-block";
import { APP_NAME, BLOCK_TYPES, BlockTypeValue } from "@shared/constants";
import {
  Loader2, AlertTriangle, FileTextIcon, Database, SearchCode, Code2, Table2Icon, InfoIcon,
  Lightbulb, Workflow, ListOrdered, MessageSquareQuote, Brain, Filter, LinkIcon, Shuffle,
  SortAsc, Share2, CheckCircle, ThumbsUp, SparklesIcon, Combine, Puzzle, TargetIcon,
  PackageSearch, Network, BookCopy, FileWarning, Construction, ShieldCheck, WorkflowIcon,
  ArrowDownUp, Variable, SlidersHorizontal, Download, GitCompareArrows, Columns,
  AlignLeft, SidebarClose, SidebarOpen, FileCode, PanelRightClose, PanelLeftOpen,
  ArrowLeft, ArrowRight, DatabaseZap, Sigma, PencilLine, Binary, ListTree, LayoutPanelTop, CornerDownRight, Terminal, Library, FileType, Wand2, Activity
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { VisualFlowDisplay } from "@/components/visual-flow-display";
import { Separator } from "@/components/ui/separator";
import { generateHtmlReport, generateFullHtmlReport } from "@/lib/report-generator"; // Updated import
import { cn } from "@/lib/utils";


type AnalysisView = "overall_script" | "summary" | "details" | "tables" | "visual_flow";


const StructuredSummaryDisplay: React.FC<{ summary: SummarizeCodeBlockOutput | undefined }> = ({ summary }) => {
  if (!summary) return <p className="text-muted-foreground">Summary data is not available.</p>;
  return (
    <div className="space-y-6">
      <Card className="border-border/40 shadow bg-card">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-xl text-primary flex items-center gap-2"><MessageSquareQuote size={22} />Main Purpose</CardTitle>
        </CardHeader>
        <CardContent className="py-3 px-4">
          <p className="text-foreground leading-relaxed">{summary.mainPurpose}</p>
        </CardContent>
      </Card>

      {summary.keyOperations && summary.keyOperations.length > 0 && (
        <Card className="border-border/40 shadow bg-card">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-xl text-primary flex items-center gap-2"><ListOrdered size={22} />Key Operations</CardTitle>
          </CardHeader>
          <CardContent className="py-3 px-4">
            <ul className="list-disc pl-5 space-y-1 text-foreground leading-relaxed">
              {summary.keyOperations.map((op, idx) => <li key={idx}>{op}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/40 shadow bg-card">
        <CardHeader className="pb-3 pt-4 px-4">
          <CardTitle className="text-xl text-primary flex items-center gap-2"><Workflow size={22} />Data Flow</CardTitle>
        </CardHeader>
        <CardContent className="py-3 px-4">
          <p className="text-foreground leading-relaxed">{summary.dataFlow}</p>
        </CardContent>
      </Card>

      {summary.coreSqlConcepts && summary.coreSqlConcepts.length > 0 && (
        <Card className="border-border/40 shadow bg-card">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-xl text-primary flex items-center gap-2"><Brain size={22} />Core SQL Concepts & Learning Points</CardTitle>
            <CardDescription className="text-muted-foreground">Key SQL techniques used in this code, explained for beginners.</CardDescription>
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
                        <p className="text-sm font-medium text-muted-foreground mb-1">Example from code:</p>
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
        <Card className="border-border/40 shadow bg-card">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-xl text-primary flex items-center gap-2"><Lightbulb size={22} />Business Logic Insights</CardTitle>
          </CardHeader>
          <CardContent className="py-3 px-4">
            <ul className="list-disc pl-5 space-y-1 text-foreground leading-relaxed">
              {summary.businessLogicInsights.map((insight, idx) => <li key={idx}>{insight}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}

      {summary.beginnerFriendlyTips && summary.beginnerFriendlyTips.length > 0 && (
        <Card className="border-border/40 shadow bg-card">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-xl text-primary flex items-center gap-2"><InfoIcon size={22} />Beginner Friendly Tips</CardTitle>
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


const RenderOutputFlowText: React.FC<{ flowText: string | undefined }> = ({ flowText }) => {
  if (!flowText) {
    return <p className="text-sm text-muted-foreground">Output flow textual representation not available.</p>;
  }

  const segments = flowText.split(/\s*->\s*/).map(segment => {
    const match = segment.match(/^\[(.*?):(.*?)\]$/);
    if (match) {
      return { type: match[1], detail: match[2], raw: segment };
    }
    return { type: "UNKNOWN", detail: segment, raw: segment };
  });

  const getBadgeVariant = (type: string): "default" | "secondary" | "outline" | "destructive" => {
    const upperType = type.toUpperCase();
    if (upperType.includes("TABLE") || upperType.includes("VIEW") || upperType.includes("CTE") || upperType.includes("IN") || upperType.includes("OUT") || upperType.includes("SOURCE") || upperType.includes("SINK") || upperType.includes("TARGET") || upperType.includes("DEF")) return "secondary";
    if (upperType.includes("JOIN") || upperType.includes("FILTER") || upperType.includes("TRANSFORM") || upperType.includes("AGG") || upperType.includes("SORT") || upperType.includes("LOGIC") || upperType.includes("OPERATION") || upperType.includes("STEP")) return "outline";
    return "default";
  };


  return (
    <div className="flex flex-wrap items-center gap-2">
      {segments.map((segment, index) => (
        <React.Fragment key={index}>
          <Badge variant={getBadgeVariant(segment.type)} className="text-xs px-2 py-1 whitespace-normal text-left">
            <strong className="font-medium">{segment.type}:</strong> {segment.detail}
          </Badge>
          {index < segments.length - 1 && <ArrowRight size={16} className="text-muted-foreground" />}
        </React.Fragment>
      ))}
    </div>
  );
};


const StructuredLogicRulesDisplay: React.FC<{ explanation: ExplainSqlBlockOutput | undefined }> = ({ explanation }) => {
  if (!explanation) return <p className="text-muted-foreground">Detailed explanation data is not available.</p>;

  const {
    chunkKeySummary,
    blockSummary,
    proceduralControlFlow,
    targetObject,
    sourceTables,
    joinAnalysis,
    transformationRulesOrFunctionLogic,
    filteringAndBusinessRules,
    outputFlow,
    dependenciesAndCrossReferences,
    codeQualitySuggestions,
    overallLogicExplanationForJuniorDev,
  } = explanation;

  const renderSection = (title: string, icon: React.ReactNode, content?: React.ReactNode, isEmpty?: boolean, emptyMessage?: string) => {
    if (isEmpty && !content) {
      return (
        <Card className="shadow my-4 bg-card border-border/40">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">{icon}{title}</CardTitle>
          </CardHeader>
          <CardContent className="py-3 px-4">
            <p className="text-muted-foreground text-sm">{emptyMessage || `No specific ${title.toLowerCase()} identified for this block.`}</p>
          </CardContent>
        </Card>
      );
    }
    if (!content && !isEmpty) return null;

    return (
      <Card className="shadow my-4 bg-card border-border/40">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">{icon}{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 py-3 px-4">
          {content}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-2">
      {chunkKeySummary && renderSection("Key Insights", <Wand2 size={20} />,
        <p className="text-foreground leading-relaxed">{chunkKeySummary}</p>
      )}

      {renderSection("Block Summary", <Puzzle size={20} />,
        blockSummary && (
          <>
            <div className="text-sm"><Badge variant="outline" className="mr-2 align-middle">Type</Badge> {blockSummary.identifiedType}</div>
            <div className="text-sm"><Badge variant="outline" className="mr-2 align-middle">Purpose</Badge> {blockSummary.purpose}</div>
            {blockSummary.inputParameters && blockSummary.inputParameters.length > 0 && (
              <div className="mt-3">
                <h4 className="text-md font-semibold mb-1 text-primary/95 flex items-center gap-2"><SlidersHorizontal size={16} />Input Parameters:</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-foreground/90">
                  {blockSummary.inputParameters.map((param, idx) => (
                    <li key={idx}>
                      <span className="font-medium">{param.name}</span>
                      {param.dataType && <Badge variant="secondary" className="ml-2 text-xs">{param.dataType}</Badge>}
                      {param.purpose && <span className="text-muted-foreground italic ml-1">- {param.purpose}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {blockSummary.functionReturnType && (
              <div className="text-sm mt-2">
                <Badge variant="outline" className="mr-2 align-middle">Function Return</Badge>
                {blockSummary.functionReturnType}
              </div>
            )}
          </>
        ),
        !blockSummary
      )}

      {renderSection("Procedural Control Flow", <ListTree size={20} />,
        proceduralControlFlow && proceduralControlFlow.length > 0 ? (
          <Accordion type="multiple" className="w-full">
            {proceduralControlFlow.map((step) => (
              <AccordionItem value={`proc-step-${step.stepNumber}`} key={`proc-step-${step.stepNumber}`} className="border-border/60 last:border-b-0">
                <AccordionTrigger className="text-md font-semibold hover:no-underline text-left text-foreground py-3">
                  Step {step.stepNumber}: {step.statement.substring(0, 50)}{step.statement.length > 50 ? '...' : ''}
                </AccordionTrigger>
                <AccordionContent className="pt-2 space-y-2 pl-2">
                  <div className="text-sm text-foreground/90">
                    <strong>Statement:</strong>
                    <CodeBlock code={step.statement} className="text-xs p-2 my-1 max-h-[150px] bg-muted/70" />
                  </div>
                  <p className="text-sm text-foreground/90"><strong>Description:</strong> {step.description}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : null,
        !proceduralControlFlow || proceduralControlFlow.length === 0,
        "No distinct procedural control flow steps were identified for this block."
      )}

      {renderSection("Target Object", <TargetIcon size={20} />,
        targetObject && (targetObject.name || targetObject.targetType) ? (
          <>
            <div className="text-sm"><Badge variant="outline" className="mr-2 align-middle">Name</Badge> {targetObject.name || "N/A"}</div>
            {targetObject.targetType && <div className="text-sm"><Badge variant="outline" className="mr-2 align-middle">Type</Badge> {targetObject.targetType}</div>}
            {targetObject.writeOperation && <div className="text-sm"><Badge variant="outline" className="mr-2 align-middle">Operation/Definition</Badge> {targetObject.writeOperation}</div>}
            {targetObject.isUsedAsSourceElsewhereInBlock !== undefined && (
              <div className="text-sm"><Badge variant="outline" className="mr-2 align-middle">Used as Source in Block?</Badge> {targetObject.isUsedAsSourceElsewhereInBlock ? "Yes" : "No"}</div>
            )}
          </>
        ) : null,
        !(targetObject && (targetObject.name || targetObject.targetType)),
        "No specific target object (Table DML, View/Function Definition) identified for this block."
      )}

      {renderSection("Source Tables", <PackageSearch size={20} />,
        sourceTables && sourceTables.length > 0 ? (
          <Accordion type="multiple" className="w-full">
            {sourceTables.map((table, idx) => (
              <AccordionItem value={`source-${idx}`} key={idx} className="border-border/60 last:border-b-0">
                <AccordionTrigger className="text-md font-semibold hover:no-underline text-left text-foreground py-3">
                  {table.name} <Badge variant="secondary" className="ml-2">{table.type}</Badge>
                </AccordionTrigger>
                <AccordionContent className="pt-2 space-y-2 pl-2">
                  <p className="text-sm text-foreground/90 leading-relaxed"><strong>Role:</strong> {table.roleDescription}</p>
                  {table.isTargetTableItself && <p className="text-sm text-muted-foreground">Note: This source is also the primary target of the block.</p>}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : null,
        !sourceTables || sourceTables.length === 0,
        "No distinct source tables were identified or they are implicitly defined."
      )}

      {renderSection("Join Analysis", <LinkIcon size={20} />,
        joinAnalysis && joinAnalysis.conditions && joinAnalysis.conditions.length > 0 ? (
          <div className="space-y-3">
            {joinAnalysis.joinsWithTargetTableExplanation && (
              <div className="text-sm text-foreground/90 p-2 bg-muted/70 rounded-md">
                <strong>Target Table Join:</strong> {joinAnalysis.joinsWithTargetTableExplanation}
              </div>
            )}
            <Accordion type="multiple" className="w-full">
              {joinAnalysis.conditions.map((join, idx) => (
                <AccordionItem value={`join-${idx}`} key={idx} className="border-border/60 last:border-b-0">
                  <AccordionTrigger className="text-md font-semibold hover:no-underline text-left flex items-center gap-2 text-foreground py-3">
                    <Badge variant={join.joinType?.toLowerCase().includes("left") ? "outline" : join.joinType?.toLowerCase().includes("right") ? "outline" : "secondary"}>
                      {join.joinType || "Unknown Type"}
                    </Badge>
                    <span>{join.tablesInvolved}</span>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 space-y-2 pl-2">
                    <div className="text-sm text-foreground/90 leading-relaxed">
                      <strong>On:</strong>
                      <CodeBlock code={join.onCondition} className="text-xs p-1 ml-1 my-1 max-h-[75px] bg-muted/70" />
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed"><strong>Purpose:</strong> {join.purpose}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ) : null,
        !joinAnalysis || !joinAnalysis.conditions || joinAnalysis.conditions.length === 0,
        "No JOIN operations were identified."
      )}

      {renderSection(
        blockSummary?.identifiedType?.toLowerCase().includes("function") ? "Function Logic Details" : "Transformation Rules",
        <Shuffle size={20} />,
        transformationRulesOrFunctionLogic && transformationRulesOrFunctionLogic.length > 0 ? (
          <Accordion type="multiple" className="w-full">
            {transformationRulesOrFunctionLogic.map((rule, idx) => (
              <AccordionItem value={`transform-${idx}`} key={idx} className="border-border/60 last:border-b-0">
                <AccordionTrigger className="text-md font-semibold hover:no-underline text-left text-foreground py-3">
                  {rule.targetColumn || "Unnamed Transformation / Logic Step"}
                </AccordionTrigger>
                <AccordionContent className="pt-2 space-y-2 pl-2">
                  <div className="text-sm text-foreground/90">
                    <strong>Logic/Expression:</strong>
                    <CodeBlock code={rule.transformationLogic} className="text-xs p-2 my-1 max-h-[150px] bg-muted/70" />
                  </div>
                  <p className="text-sm text-foreground/90"><strong>Description:</strong> {rule.description}</p>
                  {rule.sourceColumns && rule.sourceColumns.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      <strong>Sources:</strong> {rule.sourceColumns.join(', ')}
                    </p>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : null,
        !transformationRulesOrFunctionLogic || transformationRulesOrFunctionLogic.length === 0,
        blockSummary?.identifiedType?.toLowerCase().includes("function")
          ? "No specific function logic steps were detailed by the AI."
          : "No specific data transformations or column derivations were identified."
      )}

      {renderSection("Filtering & Business Rules", <Filter size={20} />,
        filteringAndBusinessRules && (
          <div className="space-y-4">
            {filteringAndBusinessRules.whereClause && (
              <div>
                <h4 className="text-md font-semibold mb-1 text-primary/95">WHERE Clause</h4>
                <CodeBlock code={filteringAndBusinessRules.whereClause} className="text-sm p-2 max-h-[150px] mb-1 bg-muted/70" />
                {filteringAndBusinessRules.whereClauseExplanation && <p className="text-sm text-foreground/90">{filteringAndBusinessRules.whereClauseExplanation}</p>}
              </div>
            )}
            {filteringAndBusinessRules.whereClause && (filteringAndBusinessRules.havingClause || (filteringAndBusinessRules.detailedConditions && filteringAndBusinessRules.detailedConditions.length > 0)) && <Separator className="my-3 bg-border/50" />}
            {filteringAndBusinessRules.havingClause && (
              <div>
                <h4 className="text-md font-semibold mb-1 text-primary/95">HAVING Clause</h4>
                <CodeBlock code={filteringAndBusinessRules.havingClause} className="text-sm p-2 max-h-[150px] mb-1 bg-muted/70" />
                {filteringAndBusinessRules.havingClauseExplanation && <p className="text-sm text-foreground/90">{filteringAndBusinessRules.havingClauseExplanation}</p>}
              </div>
            )}
            {filteringAndBusinessRules.detailedConditions && filteringAndBusinessRules.detailedConditions.length > 0 && (
              <div className="mt-3">
                <h4 className="text-md font-semibold mb-2 text-primary/95">Detailed Conditions</h4>
                <Accordion type="multiple" className="w-full">
                  {filteringAndBusinessRules.detailedConditions.map((cond, idx) => (
                    <AccordionItem value={`condition-${idx}`} key={idx} className="border-border/60 last:border-b-0">
                      <AccordionTrigger className="text-foreground py-3"><Badge variant="outline" className="mr-2">{cond.clause}</Badge> {cond.conditionSnippet.substring(0, 50)}{cond.conditionSnippet.length > 50 ? '...' : ''}</AccordionTrigger>
                      <AccordionContent className="text-foreground/90 pt-2 space-y-1">
                        <CodeBlock code={cond.conditionSnippet} className="text-xs p-2 max-h-[100px] mb-2 bg-muted/70" />
                        <p className="text-sm"><strong>Explanation:</strong> {cond.explanation}</p>
                        {cond.impliedBusinessRule && <p className="text-sm text-muted-foreground"><strong>Implied Rule:</strong> {cond.impliedBusinessRule}</p>}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}
            {(filteringAndBusinessRules.detailedConditions && filteringAndBusinessRules.detailedConditions.length > 0) && (filteringAndBusinessRules.windowFunctions && filteringAndBusinessRules.windowFunctions.length > 0) && <Separator className="my-3 bg-border/50" />}
            {filteringAndBusinessRules.windowFunctions && filteringAndBusinessRules.windowFunctions.length > 0 && (
              <div className="mt-3">
                <h4 className="text-md font-semibold mb-2 text-primary/95">Window Functions</h4>
                <Accordion type="multiple" className="w-full">
                  {filteringAndBusinessRules.windowFunctions.map((wf, idx) => (
                    <AccordionItem value={`wf-${idx}`} key={idx} className="border-border/60 last:border-b-0">
                      <AccordionTrigger className="text-foreground py-3">{wf.functionSignature.substring(0, 60)}{wf.functionSignature.length > 60 ? '...' : ''}</AccordionTrigger>
                      <AccordionContent className="text-foreground/90 pt-2 space-y-1">
                        <CodeBlock code={wf.functionSignature} className="text-xs p-2 max-h-[100px] mb-2 bg-muted/70" />
                        <p className="text-sm "><strong>Purpose:</strong> {wf.purpose}</p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}
            {filteringAndBusinessRules.udfsOrProceduresUsedInFiltering && filteringAndBusinessRules.udfsOrProceduresUsedInFiltering.length > 0 && (
              <div className="mt-3">
                <h4 className="text-md font-semibold mb-1 text-primary/95">UDFs/Procedures in Filtering</h4>
                <ul className="list-disc pl-5 text-sm space-y-1 text-foreground/90">
                  {filteringAndBusinessRules.udfsOrProceduresUsedInFiltering.map((item, idx) => (
                    <li key={`udf-filter-${idx}`}>
                      <div className="font-medium">{item.name}</div>
                      {item.usageContext && <div className="text-muted-foreground italic ml-1 text-xs"> {item.usageContext}</div>}
                      {item.inferredPurpose && <div className="text-xs text-muted-foreground/80 pl-3"><em>Purpose: {item.inferredPurpose}</em></div>}
                      {item.parametersPassed && item.parametersPassed.length > 0 && (
                        <div className="text-xs text-muted-foreground pl-3">Params: {item.parametersPassed.join(', ')}</div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {filteringAndBusinessRules.otherImpliedBusinessRules && filteringAndBusinessRules.otherImpliedBusinessRules.length > 0 && (
              <div className="mt-3">
                <h4 className="text-md font-semibold mb-1 text-primary/95">Other Implied Business Rules</h4>
                <ul className="list-disc pl-5 text-sm text-foreground/90 space-y-1">
                  {filteringAndBusinessRules.otherImpliedBusinessRules.map((rule, idx) => (
                    <li key={`other-rule-${idx}`}>{rule}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ),
        !filteringAndBusinessRules || (
          !filteringAndBusinessRules.whereClause &&
          !filteringAndBusinessRules.havingClause &&
          (!filteringAndBusinessRules.detailedConditions || filteringAndBusinessRules.detailedConditions.length === 0) &&
          (!filteringAndBusinessRules.windowFunctions || filteringAndBusinessRules.windowFunctions.length === 0) &&
          (!filteringAndBusinessRules.udfsOrProceduresUsedInFiltering || filteringAndBusinessRules.udfsOrProceduresUsedInFiltering.length === 0) &&
          (!filteringAndBusinessRules.otherImpliedBusinessRules || filteringAndBusinessRules.otherImpliedBusinessRules.length === 0)

        ),
        "No significant filtering (WHERE/HAVING), window functions, or explicit business rules were identified in this section."
      )}

      {renderSection("Output Flow", <WorkflowIcon size={20} />,
        outputFlow && (
          <>
            {outputFlow.textualRepresentation && <RenderOutputFlowText flowText={outputFlow.textualRepresentation} />}
            {outputFlow.dataSources && outputFlow.dataSources.length > 0 && <div className="text-sm mt-2 text-foreground/90"><strong>Sources:</strong> {outputFlow.dataSources.join(', ')}</div>}
            {outputFlow.keyTransformationsInFlow && outputFlow.keyTransformationsInFlow.length > 0 && <div className="text-sm text-foreground/90"><strong>Key Transformations:</strong> {outputFlow.keyTransformationsInFlow.join('; ')}</div>}
            {outputFlow.dataSink && <div className="text-sm text-foreground/90"><strong>Sink/Output:</strong> {outputFlow.dataSink}</div>}
          </>
        ),
        !outputFlow || !outputFlow.textualRepresentation,
        "Information about the overall data output flow was not specifically detailed."
      )}

      {renderSection("Dependencies & References", <Network size={20} />,
        dependenciesAndCrossReferences && (
          <div className="space-y-3">
            {dependenciesAndCrossReferences.externalObjectsCalledOrReferenced && dependenciesAndCrossReferences.externalObjectsCalledOrReferenced.length > 0 && (
              <div>
                <h4 className="text-md font-semibold mb-1 text-primary/95">External Objects Called or Referenced</h4>
                <ul className="list-disc pl-5 text-sm space-y-1 text-foreground/90">
                  {dependenciesAndCrossReferences.externalObjectsCalledOrReferenced.map((dep, i) =>
                    <li key={`dep-${i}`}>
                      <div className="font-medium">{dep.objectName} <span className="text-xs text-muted-foreground">({dep.objectType})</span></div>
                      {dep.usageContext && <div className="text-muted-foreground italic ml-1 text-xs"> {dep.usageContext}</div>}
                      {dep.inferredPurpose && <div className="text-xs text-muted-foreground/80 pl-3"><em>Purpose: {dep.inferredPurpose}</em></div>}
                    </li>)}
                </ul>
              </div>
            )}
            {dependenciesAndCrossReferences.potentialLogicOverlaps && dependenciesAndCrossReferences.potentialLogicOverlaps.length > 0 && (
              <div className="mt-2">
                <h4 className="text-md font-semibold mb-1 text-primary/95">Potential Logic Overlaps</h4>
                <Accordion type="multiple" className="w-full">
                  {dependenciesAndCrossReferences.potentialLogicOverlaps.map((overlap, idx) => (
                    <AccordionItem value={`overlap-${idx}`} key={idx} className="border-border/60 last:border-b-0">
                      <AccordionTrigger className="text-foreground py-3">{overlap.referencedObject} {overlap.similarityPercentage !== undefined && <Badge variant="destructive" className="ml-2">{overlap.similarityPercentage}% similar</Badge>}</AccordionTrigger>
                      <AccordionContent className="text-foreground/90 pt-2 space-y-1">
                        <p>{overlap.overlapDescription}</p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}
          </div>
        ),
        !dependenciesAndCrossReferences || (
          (!dependenciesAndCrossReferences.externalObjectsCalledOrReferenced || dependenciesAndCrossReferences.externalObjectsCalledOrReferenced.length === 0) &&
          (!dependenciesAndCrossReferences.potentialLogicOverlaps || dependenciesAndCrossReferences.potentialLogicOverlaps.length === 0)
        ),
        "No specific dependencies or cross-references were identified."
      )}

      {renderSection("Code Quality & Optimization", <Construction size={20} />,
        codeQualitySuggestions && codeQualitySuggestions.suggestions && codeQualitySuggestions.suggestions.length > 0 ? (
          <div className="space-y-2">
            {codeQualitySuggestions.suggestions.map((sugg, idx) => (
              <Alert key={idx} variant={sugg.suggestionType === "Pitfall" || sugg.suggestionType === "PerformanceWarning" ? "destructive" : "default"} className="shadow border-border/60 bg-card">
                {sugg.suggestionType === "Pitfall" || sugg.suggestionType === "PerformanceWarning" ? <FileWarning className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                <AlertTitle className={(sugg.suggestionType === "Pitfall" || sugg.suggestionType === "PerformanceWarning") ? "text-destructive" : "text-primary"}>
                  {sugg.suggestionType}: {sugg.suggestion.substring(0, 50)}{sugg.suggestion.length > 50 ? '...' : ''}
                </AlertTitle>
                <AlertDescription className="text-foreground/90">
                  <p>{sugg.suggestion}</p>
                  {sugg.reasoning && <p className="text-xs mt-1 text-muted-foreground"><em>Reasoning: {sugg.reasoning}</em></p>}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        ) : null,
        !codeQualitySuggestions || !codeQualitySuggestions.suggestions || codeQualitySuggestions.suggestions.length === 0,
        "No specific code quality suggestions or optimizations were provided for this block."
      )}

      {renderSection("Overall Explanation for Junior Developers", <BookCopy size={20} />,
        overallLogicExplanationForJuniorDev && <div className="text-foreground leading-relaxed whitespace-pre-wrap">{overallLogicExplanationForJuniorDev}</div>,
        !overallLogicExplanationForJuniorDev
      )}
    </div>
  );
};

interface SidebarNavItemProps {
  view: AnalysisView;
  currentView: AnalysisView;
  setView: (view: AnalysisView) => void;
  label: string;
  icon: React.ReactNode;
  isSidebarOpen: boolean;
}

const SidebarNavItem: React.FC<SidebarNavItemProps> = ({ view, currentView, setView, label, icon, isSidebarOpen }) => (
  <Button
    variant="ghost"
    onClick={() => setView(view)}
    className={cn(
      "w-full justify-start text-left h-10 px-3 py-2 rounded-md text-sm font-medium transition-colors",
      "text-sidebar-foreground hover:text-sidebar-primary hover:bg-sidebar-accent/20",
      currentView === view && "bg-sidebar-accent text-sidebar-accent-foreground font-semibold",
      !isSidebarOpen && "px-0 justify-center w-12"
    )}
    title={!isSidebarOpen ? label : undefined}
  >
    <span className={cn("w-5 h-5", isSidebarOpen ? "mr-3" : "mx-auto")}>{icon}</span>
    {isSidebarOpen && label}
  </Button>
);

const UnifiedTableDisplay: React.FC<{ tableInfo: ExtractTableInfoOutput | undefined }> = ({ tableInfo }) => {
  if (!tableInfo || !tableInfo.identifiedTables || tableInfo.identifiedTables.length === 0) {
    return (
      <Card className="border-border/40 shadow bg-card">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-xl text-primary flex items-center gap-2"><Database size={22} />Table Analysis</CardTitle>
        </CardHeader>
        <CardContent className="py-3 px-4">
          <p className="text-muted-foreground text-sm flex items-center gap-2">
            <InfoIcon size={16} />
            No tables were identified in this SQL code chunk.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getRoleBadgeVariant = (role: IdentifiedTable['primaryRole']): "default" | "secondary" | "destructive" | "outline" => {
    switch (role) {
      case "Source": return "default";
      case "Target": return "destructive";
      case "SourceAndTarget": return "secondary";
      case "Mentioned": return "outline";
      default: return "outline";
    }
  };

  const getRoleIcon = (role: IdentifiedTable['primaryRole']) => {
    switch (role) {
      case "Source": return <PackageSearch size={16} className="mr-1 text-primary" />;
      case "Target": return <TargetIcon size={16} className="mr-1 text-destructive" />;
      case "SourceAndTarget": return <Combine size={16} className="mr-1 text-secondary-foreground" />;
      case "Mentioned": return <Network size={16} className="mr-1 text-muted-foreground" />;
      default: return <Database size={16} className="mr-1 text-muted-foreground" />;
    }
  }


  return (
    <Card className="border-border/40 shadow bg-card">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-xl text-primary flex items-center gap-2"><DatabaseZap size={22} />Unified Table Analysis</CardTitle>
        <CardDescription className="text-muted-foreground">All tables involved in this SQL code chunk and their roles.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 py-3 px-4">
        {tableInfo.identifiedTables.map((table, index) => (
          <Card key={index} className="shadow-sm bg-card/90 border-border/70 hover:shadow-md transition-shadow">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-md flex items-center justify-between text-foreground">
                <span className="flex items-center gap-2">
                  <Table2Icon size={18} /> {table.name}
                </span>
                <Badge variant={getRoleBadgeVariant(table.primaryRole)} className="text-xs flex items-center gap-1">
                  {getRoleIcon(table.primaryRole)} {table.primaryRole}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <p className="text-sm text-foreground/90 mb-2 leading-relaxed">{table.roleDescription}</p>
              {table.operations && table.operations.length > 0 && (
                <div className="flex flex-wrap gap-1 items-center">
                  <span className="text-xs font-medium mr-1 text-muted-foreground">Operations:</span>
                  {table.operations.map(op => <Badge key={op} variant="secondary" className="text-xs bg-muted hover:bg-muted/80 text-muted-foreground">{op}</Badge>)}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
};


const OverallScriptAnalysisDisplay: React.FC<{ payload: FullAnalysisPayload }> = ({ payload }) => {
  const { overallScriptSummary, chunkAnalyses } = payload;

  const allUniqueTables = React.useMemo(() => {
    const tableNames = new Set<string>();
    chunkAnalyses.forEach(chunk => {
      if (chunk.tableInfo && chunk.tableInfo.identifiedTables) {
        chunk.tableInfo.identifiedTables.forEach(t => tableNames.add(t.name));
      }
    });
    return Array.from(tableNames);
  }, [chunkAnalyses]);


  return (
    <div className="space-y-6">
      {overallScriptSummary && overallScriptSummary.trim() !== "" && overallScriptSummary !== "Overall script summary was not generated." && (
        <Card className="border-border/40 shadow bg-card">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-xl text-primary flex items-center gap-2"><FileType size={22} />Overall Script Summary</CardTitle>
          </CardHeader>
          <CardContent className="py-3 px-4">
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">{overallScriptSummary}</p>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/40 shadow bg-card">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-xl text-primary flex items-center gap-2"><ListTree size={22} />Chunk Breakdown</CardTitle>
          <CardDescription className="text-muted-foreground">Identified primary operation for each processed chunk.</CardDescription>
        </CardHeader>
        <CardContent className="py-3 px-4">
          {chunkAnalyses.length > 0 ? (
            <ul className="list-decimal pl-5 space-y-2 text-foreground">
              {chunkAnalyses.map(chunk => (
                <li key={`chunk-summary-${chunk.chunkNumber}`}>
                  <strong>Chunk {chunk.chunkNumber} of {chunk.totalChunks}:</strong> {chunk.detailedExplanation?.blockSummary?.identifiedType || "Type not identified"}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No chunks were processed or identified.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/40 shadow bg-card">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-xl text-primary flex items-center gap-2"><DatabaseZap size={22} />All Unique Tables Identified Across Script</CardTitle>
          <CardDescription className="text-muted-foreground">Consolidated list of tables mentioned across all chunks.</CardDescription>
        </CardHeader>
        <CardContent className="py-3 px-4">
          {allUniqueTables.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {allUniqueTables.map(tableName => (
                <Badge key={tableName} variant="secondary" className="text-sm bg-muted hover:bg-muted/80 text-muted-foreground">{tableName}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No tables were identified across the script.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};


export default function SqlAnalyzerPage() {
  const [sqlCode, setSqlCode] = React.useState<string>("");
  const [fileName, setFileName] = React.useState<string>("");
  const [blockType, setBlockType] = React.useState<BlockTypeValue | undefined>(BLOCK_TYPES[3].value);
  const [model, setModel] = React.useState<'gemini' | 'openai'>('gemini');
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const [fullAnalysisPayload, setFullAnalysisPayload] = React.useState<FullAnalysisPayload | null>(null);
  const [currentChunkIndex, setCurrentChunkIndex] = React.useState<number>(0);
  const [error, setError] = React.useState<AnalysisError | null>(null);

  const [currentView, setCurrentView] = React.useState<AnalysisView>("summary");
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isRawCodePanelOpen, setIsRawCodePanelOpen] = React.useState(true);


  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.sql') && !file.name.endsWith('.txt')) {
        setError({ error: "Invalid File Type", details: "Please upload a .sql or .txt file." });
        setFileName("");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }
      setError(null);
      setFileName(file.name);
      try {
        const text = await file.text();
        setSqlCode(text);
      } catch (e) {
        setError({ error: "File Read Error", details: "Could not read the selected file." });
        setFileName("");
      }
    }
  };

  const handleAnalyze = async () => {
    if (!sqlCode.trim()) {
      setError({ error: "Input Required", details: "SQL code cannot be empty." });
      return;
    }
    if (!blockType) {
      setError({ error: "Input Required", details: "Please select a block type." });
      return;
    }

    setIsLoading(true);
    setError(null);
    setFullAnalysisPayload(null);
    setCurrentChunkIndex(0);

    try {
      const result = await ApiClient.analyzeSQL({ sqlCode, blockType, model });

      if (result.chunkAnalyses.length > 0 || (result.overallScriptSummary && result.overallScriptSummary.trim() !== "" && result.overallScriptSummary !== "Overall script summary was not generated.")) {
        setFullAnalysisPayload(result);
        // Default to overall script view if available and multiple chunks, or if it's a script type that generated an overall summary
        if (result.overallScriptSummary && result.overallScriptSummary.trim() !== "" && result.overallScriptSummary !== "Overall script summary was not generated." && (result.chunkAnalyses.length > 1 || (result.chunkAnalyses.length === 1 && blockType === "SQL Script"))) {
          setCurrentView("overall_script");
        } else if (result.chunkAnalyses.length > 0) { // If no overall summary but chunks exist, default to first chunk's summary
          setCurrentView("summary");
        } else { // Fallback if overall summary is there but no chunks (should be rare)
          setCurrentView("overall_script");
        }
      } else {
        setError({ error: "Analysis Incomplete", details: "No processable chunks or overall summary were found in the provided SQL." });
        setFullAnalysisPayload(null);
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setError({
          error: error.message,
          details: error.details
        });
      } else {
        setError({
          error: "Network Error",
          details: "Failed to connect to analysis server. Please ensure the server is running."
        });
      }
      setFullAnalysisPayload(null);
    }

    setIsLoading(false);
  };

  const isAnalyzeDisabled = isLoading || !sqlCode.trim() || !blockType;

  const currentChunkData = fullAnalysisPayload?.chunkAnalyses?.[currentChunkIndex];

  const handleExportChunkReport = () => {
    if (!currentChunkData) return;

    const htmlContent = generateHtmlReport(currentChunkData, APP_NAME);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
    const safeBlockType = currentChunkData.blockType.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const chunkInfo = fullAnalysisPayload && fullAnalysisPayload.chunkAnalyses.length > 1 ? `_chunk_${currentChunkData.chunkNumber}` : "";
    a.href = url;
    a.download = `${safeBlockType}_analysis_report${chunkInfo}_${timestamp}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportFullReport = () => {
    if (!fullAnalysisPayload) return;

    const htmlContent = generateFullHtmlReport(fullAnalysisPayload, APP_NAME);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
    a.href = url;
    a.download = `full_sql_script_report_${timestamp}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  const renderAnalysisContent = () => {
    if (!fullAnalysisPayload) return null;

    if (currentView === "overall_script" && (fullAnalysisPayload.overallScriptSummary && fullAnalysisPayload.overallScriptSummary.trim() !== "" && fullAnalysisPayload.overallScriptSummary !== "Overall script summary was not generated.")) {
      return <OverallScriptAnalysisDisplay payload={fullAnalysisPayload} />;
    }

    if (!currentChunkData && currentView !== "overall_script") {
      // If we expect chunk data but don't have it (and not in overall view)
      if (fullAnalysisPayload.chunkAnalyses.length > 0) {
        return <p className="text-muted-foreground p-4">Select a chunk to view its analysis.</p>;
      }
      return <p className="text-muted-foreground p-4">No chunk analysis data available for this view. Try the 'Overall Script' view if available.</p>;
    }

    if (!currentChunkData) return null; // Should be covered by above, but as a fallback


    switch (currentView) {
      case "summary":
        return <StructuredSummaryDisplay summary={currentChunkData.summary} />;
      case "details":
        return <StructuredLogicRulesDisplay explanation={currentChunkData.detailedExplanation} />;
      case "tables":
        return <UnifiedTableDisplay tableInfo={currentChunkData.tableInfo} />;
      case "visual_flow":
        return (
          <Card className="border-border/40 shadow bg-card">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-xl text-primary flex items-center gap-2"><GitCompareArrows size={22} />SQL Visual Flow</CardTitle>
              <CardDescription className="text-muted-foreground">A step-by-step visual breakdown of the SQL code's logical operations for this chunk.</CardDescription>
            </CardHeader>
            <CardContent className="py-3 px-4">
              {currentChunkData.logicalFlowSteps && currentChunkData.logicalFlowSteps.flowSteps.length > 0 ? (
                <VisualFlowDisplay flowData={currentChunkData.logicalFlowSteps} />
              ) : (
                <div className="mt-4 p-4 border border-dashed border-border rounded-lg bg-card/50">
                  <div className="text-muted-foreground text-sm flex items-center gap-2">
                    <InfoIcon size={16} />
                    No logical flow steps were generated for this chunk.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  const displayedRawCode = (currentView === "overall_script" && fullAnalysisPayload?.originalFullSqlCode)
    ? fullAnalysisPayload.originalFullSqlCode
    : currentChunkData?.rawCode;

  const rawCodeTitle = (currentView === "overall_script" && fullAnalysisPayload?.originalFullSqlCode)
    ? "Full SQL Script"
    : currentChunkData ? `SQL Code (Chunk ${currentChunkData.chunkNumber} of ${currentChunkData.totalChunks})` : "SQL Code";

  const showOverallScriptNavItem = fullAnalysisPayload?.overallScriptSummary && fullAnalysisPayload.overallScriptSummary.trim() !== "" && fullAnalysisPayload.overallScriptSummary !== "Overall script summary was not generated.";


  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="py-10 mb-8 border-b border-border/30 bg-gradient-to-r from-background to-muted/30 dark:from-background dark:to-muted/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-screen-xl">
          <h1 className="text-5xl font-bold text-center text-primary tracking-tight">{APP_NAME}</h1>
          <p className="text-center text-muted-foreground mt-3 max-w-2xl mx-auto text-lg">
            Paste your SQL code or upload a file. 'GO' (on its own line) separates batches. Without 'GO', semicolons (;) separate statements (caution with ';' in comments/strings).
          </p>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-screen-xl">
        <Card className="shadow-lg mb-8 border-border/50 bg-card">
          <CardHeader className="py-4 px-6">
            <CardTitle className="text-2xl text-primary">Input SQL Code</CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter SQL Server code. 'GO' (on its own line) separates batches. Without 'GO', semicolons (;) separate statements (caution with ';' in comments/strings).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="grid gap-2">
              <Label htmlFor="sql-code-area" className="text-sm font-medium text-foreground/90">SQL Code</Label>
              <Textarea
                id="sql-code-area"
                placeholder="Paste your SQL code here..."
                value={sqlCode}
                onChange={(e) => setSqlCode(e.target.value)}
                rows={12}
                className="font-mono text-sm leading-relaxed shadow-sm focus:ring-2 focus:ring-primary/50 border-input bg-background"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label htmlFor="file-upload" className="text-sm font-medium text-foreground/90">Upload File (.sql, .txt)</Label>
                <div className="flex items-center">
                  <Input
                    id="file-upload"
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".sql,.txt"
                    className="w-auto p-0 border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 file:mr-2 file:px-3 file:py-1.5 file:h-9 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                  {fileName && <span className="ml-2 text-sm text-muted-foreground truncate max-w-[200px]">{fileName}</span>}
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="block-type" className="text-sm font-medium text-foreground/90">Overall Code Type (Hint)</Label>
                <Select value={blockType} onValueChange={(value: BlockTypeValue) => setBlockType(value)}>
                  <SelectTrigger id="block-type" className="w-full shadow-sm focus:ring-2 focus:ring-primary/50 border-input bg-background">
                    <SelectValue placeholder="Select block type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BLOCK_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="model" className="text-sm font-medium text-foreground/90">Select AI Model</Label>
                <Select value={model} onValueChange={(value: 'gemini' | 'openai') => setModel(value)}>
                  <SelectTrigger id="model" className="w-full shadow-sm focus:ring-2 focus:ring-primary/50 border-input bg-background">
                    <SelectValue placeholder="Select AI model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">Gemini</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          <CardFooter className="p-6">
            <Button onClick={handleAnalyze} disabled={isAnalyzeDisabled} size="lg" className="w-full sm:w-auto shadow-md hover:shadow-lg transition-all duration-200 text-base py-3 h-auto bg-primary hover:bg-primary/90 text-primary-foreground">
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <SparklesIcon className="mr-2 h-5 w-5" />
              )}
              Analyze Code
            </Button>
          </CardFooter>
        </Card>

        {error && (
          <Alert variant="destructive" className="mb-8 shadow-lg">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle>
              {error.error}
              {error.chunkNumber && ` (Chunk ${error.chunkNumber}${error.totalChunks ? ` of ${error.totalChunks}` : ''})`}
            </AlertTitle>
            {error.details && <AlertDescription>{error.details}</AlertDescription>}
          </Alert>
        )}

        {fullAnalysisPayload && (fullAnalysisPayload.chunkAnalyses.length > 0 || showOverallScriptNavItem) && (
          <>
            <div className="flex flex-col lg:flex-row gap-x-6">
              {/* Sidebar */}
              <aside className={cn(
                "lg:sticky lg:top-8 lg:h-[calc(100vh-4rem)] transition-all duration-300 ease-in-out mb-6 lg:mb-0",
                isSidebarOpen ? "lg:w-64" : "lg:w-[4.5rem]"
              )}>
                <Card className="shadow-md border-sidebar-border bg-sidebar h-full">
                  <CardHeader className="p-3 border-b border-sidebar-border/70 flex flex-row items-center justify-between">
                    {isSidebarOpen && <CardTitle className="text-lg text-sidebar-primary ml-1">Analysis Sections</CardTitle>}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                      className={cn("text-sidebar-muted-foreground hover:text-sidebar-primary", !isSidebarOpen && "mx-auto")}
                      title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
                    >
                      {isSidebarOpen ? <SidebarClose size={20} /> : <SidebarOpen size={20} />}
                    </Button>
                  </CardHeader>
                  <CardContent className={cn("p-3 space-y-1.5 overflow-y-auto", !isSidebarOpen && "overflow-x-hidden")}>
                    {showOverallScriptNavItem && (
                      <SidebarNavItem view="overall_script" currentView={currentView} setView={setCurrentView} label="Overall Script" icon={<FileType size={18} />} isSidebarOpen={isSidebarOpen} />
                    )}
                    <SidebarNavItem view="summary" currentView={currentView} setView={setCurrentView} label="Chunk Summary" icon={<AlignLeft size={18} />} isSidebarOpen={isSidebarOpen} />
                    <SidebarNavItem view="details" currentView={currentView} setView={setCurrentView} label="Chunk Deep Dive" icon={<SearchCode size={18} />} isSidebarOpen={isSidebarOpen} />
                    <SidebarNavItem view="tables" currentView={currentView} setView={setCurrentView} label="Chunk Tables" icon={<Database size={18} />} isSidebarOpen={isSidebarOpen} />
                    <SidebarNavItem view="visual_flow" currentView={currentView} setView={setCurrentView} label="Chunk Visual Flow" icon={<GitCompareArrows size={18} />} isSidebarOpen={isSidebarOpen} />
                  </CardContent>
                </Card>
              </aside>

              {/* Main Content Panes */}
              <main className={cn(
                "flex-1 grid grid-cols-1 gap-x-8 min-w-0",
                isRawCodePanelOpen ? "lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]" : "lg:grid-cols-[1fr]"
              )}>
                {/* Analysis Content Pane */}
                <div className="min-w-0 space-y-6">
                  <Card className="shadow-md border-border/50 bg-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-4">
                      <CardTitle className="text-xl text-primary">
                        {currentView === "overall_script" && "Overall Script Analysis"}
                        {currentView === "summary" && "Chunk Summary"}
                        {currentView === "details" && "Chunk Deep Dive Analysis"}
                        {currentView === "tables" && "Chunk Table Analysis"}
                        {currentView === "visual_flow" && "Chunk SQL Visual Flow"}
                        {fullAnalysisPayload?.chunkAnalyses.length > 1 && currentView !== "overall_script" && currentChunkData && (
                          <span className="text-base font-normal text-muted-foreground ml-2">(Chunk {currentChunkData.chunkNumber} of {currentChunkData.totalChunks})</span>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setIsRawCodePanelOpen(!isRawCodePanelOpen)}
                          className="text-muted-foreground hover:text-primary hidden lg:flex"
                          title={isRawCodePanelOpen ? "Hide Code Panel" : "Show Code Panel"}
                        >
                          {isRawCodePanelOpen ? <PanelRightClose size={18} /> : <PanelLeftOpen size={18} />}
                        </Button>
                        {currentView !== "overall_script" && currentChunkData && (
                          <Button onClick={handleExportChunkReport} variant="outline" size="sm" className="ml-auto">
                            <Download size={16} className="mr-2" />
                            Export Chunk Report
                          </Button>
                        )}
                        {currentView === "overall_script" && fullAnalysisPayload && (
                          <Button onClick={handleExportFullReport} variant="outline" size="sm" className="ml-auto">
                            <Download size={16} className="mr-2" />
                            Export Full Report
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    {fullAnalysisPayload.chunkAnalyses.length > 1 && currentView !== "overall_script" && (
                      <CardContent className="p-4 pt-0 flex items-center justify-start gap-2 sm:gap-4 border-b border-border/50">
                        <Button
                          onClick={() => setCurrentChunkIndex(prev => Math.max(0, prev - 1))}
                          disabled={currentChunkIndex === 0}
                          variant="outline"
                          size="sm"
                        >
                          <ArrowLeft size={16} className="mr-1 sm:mr-2" /> Previous Chunk
                        </Button>
                        <Button
                          onClick={() => setCurrentChunkIndex(prev => Math.min(fullAnalysisPayload.chunkAnalyses.length - 1, prev + 1))}
                          disabled={currentChunkIndex === fullAnalysisPayload.chunkAnalyses.length - 1}
                          variant="outline"
                          size="sm"
                        >
                          Next Chunk <ArrowRight size={16} className="ml-1 sm:ml-2" />
                        </Button>
                      </CardContent>
                    )}
                    <CardContent className="p-4">
                      {renderAnalysisContent()}
                    </CardContent>
                  </Card>
                </div>

                {/* Raw Code Pane */}
                {isRawCodePanelOpen && displayedRawCode && (
                  <div className="min-w-0 lg:sticky lg:top-8 h-fit mt-6 lg:mt-0">
                    <Card className="shadow-md border-border/50 bg-card">
                      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-xl text-primary flex items-center gap-2"><FileCode size={22} />
                          {rawCodeTitle}
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsRawCodePanelOpen(!isRawCodePanelOpen)}
                          className="text-muted-foreground hover:text-primary lg:hidden"
                          title={isRawCodePanelOpen ? "Hide Code Panel" : "Show Code Panel"}
                        >
                          {isRawCodePanelOpen ? <PanelRightClose size={20} /> : <PanelLeftOpen size={20} />}
                        </Button>
                      </CardHeader>
                      <CardContent className="p-4">
                        <CodeBlock code={displayedRawCode} className="max-h-[calc(100vh-12rem)] bg-muted/80" />
                      </CardContent>
                    </Card>
                  </div>
                )}
              </main>
            </div>
          </>
        )}

        <footer className="text-center py-12 mt-16 text-sm text-muted-foreground border-t border-border/30">
          <p>&copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
          <p>Powered by Genkit and Next.js.</p>
        </footer>
      </div>
    </div>
  );
}
