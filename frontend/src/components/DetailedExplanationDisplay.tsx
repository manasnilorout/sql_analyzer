// src/components/DetailedExplanationDisplay.tsx
"use client";

import * as React from "react";
import type { SharedExplainSqlBlockOutput } from "@shared/types/analysis";
// Import other nested types from shared/types/analysis if they were defined there,
// otherwise, we might need to define simplified local versions or rely on 'any' temporarily if too complex for this step.
// For now, let's assume the key parts of SharedExplainSqlBlockOutput are available.

import { cn } from "@/lib/utils"; // Added import for cn
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CodeBlock } from "@/components/code-block";
import { Separator } from "@/components/ui/separator";
import {
  Wand2, Puzzle, SlidersHorizontal, ListTree, TargetIcon, PackageSearch, LinkIcon, Shuffle, Filter, WorkflowIcon, Network, Construction, BookCopy,
  FileWarning, ShieldCheck, ArrowRight, InfoIcon
} from "lucide-react";

// Helper component for rendering textual output flow (moved from sql-analyzer-page)
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

interface DetailedExplanationDisplayProps {
  explanation: SharedExplainSqlBlockOutput | null | undefined;
}

const DetailedExplanationDisplay: React.FC<DetailedExplanationDisplayProps> = ({ explanation }) => {
  if (!explanation) {
     return (
      <Card className="border-border/40 shadow-sm bg-card">
        <CardHeader>
          <CardTitle className="text-lg text-muted-foreground">Detailed Explanation Not Available</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">AI detailed explanation for this section could not be generated or is not applicable.</p>
        </CardContent>
      </Card>
    );
  }

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
    if (isEmpty && !content) { // Content is explicitly empty by check
      return (
        <Card className="shadow-sm my-3 bg-card border-border/40">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-md font-semibold text-primary flex items-center gap-2">{icon}{title}</CardTitle>
          </CardHeader>
          <CardContent className="py-3 px-4">
            <p className="text-muted-foreground text-sm">{emptyMessage || `No specific ${title.toLowerCase()} identified for this block.`}</p>
          </CardContent>
        </Card>
      );
    }
     // If content is falsy (undefined, null, empty array/object that wasn't caught by isEmpty) but not explicitly marked as empty, don't render the section.
    if (!content && !isEmpty) return null;


    return (
      <Card className="shadow-sm my-3 bg-card border-border/40">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-md font-semibold text-primary flex items-center gap-2">{icon}{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 py-3 px-4 text-sm">
          {content}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-2">
      {chunkKeySummary && renderSection("Key Insights", <Wand2 size={18} />,
        <p className="text-foreground leading-relaxed">{chunkKeySummary}</p>
      )}

      {renderSection("Block Summary", <Puzzle size={18} />,
        blockSummary && (
          <>
            <div className="text-sm"><Badge variant="outline" className="mr-2 align-middle">Type</Badge> {blockSummary.identifiedType}</div>
            <div className="text-sm"><Badge variant="outline" className="mr-2 align-middle">Purpose</Badge> {blockSummary.purpose}</div>
            {blockSummary.inputParameters && blockSummary.inputParameters.length > 0 && (
              <div className="mt-2">
                <h4 className="text-sm font-semibold mb-1 text-primary/95 flex items-center gap-2"><SlidersHorizontal size={15} />Input Parameters:</h4>
                <ul className="list-disc pl-5 space-y-1 text-xs text-foreground/90">
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
              <div className="text-sm mt-1">
                <Badge variant="outline" className="mr-2 align-middle">Function Return</Badge>
                {blockSummary.functionReturnType}
              </div>
            )}
          </>
        ),
        !blockSummary, // isEmpty condition
        "Block summary information not available."
      )}

      {renderSection("Procedural Control Flow", <ListTree size={18} />,
        proceduralControlFlow && proceduralControlFlow.length > 0 ? (
          <Accordion type="multiple" className="w-full">
            {proceduralControlFlow.map((step) => (
              <AccordionItem value={`proc-step-${step.stepNumber}`} key={`proc-step-${step.stepNumber}`} className="border-border/60 last:border-b-0">
                <AccordionTrigger className="text-sm font-semibold hover:no-underline text-left text-foreground py-2">
                  Step {step.stepNumber}: {step.statement.substring(0, 40)}{step.statement.length > 40 ? '...' : ''}
                </AccordionTrigger>
                <AccordionContent className="pt-1 space-y-1 pl-2">
                  <div className="text-xs text-foreground/90">
                    <strong>Statement:</strong>
                    <CodeBlock code={step.statement} className="text-xs p-2 my-1 max-h-[100px] bg-muted/70" />
                  </div>
                  <p className="text-xs text-foreground/90"><strong>Description:</strong> {step.description}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : null, // content is null if array is empty or undefined
        !proceduralControlFlow || proceduralControlFlow.length === 0, // isEmpty condition
        "No distinct procedural control flow steps were identified for this block."
      )}

      {renderSection("Target Object", <TargetIcon size={18} />,
        targetObject && (targetObject.name || targetObject.targetType) ? (
          <>
            <div className="text-xs"><Badge variant="outline" className="mr-2 align-middle">Name</Badge> {targetObject.name || "N/A"}</div>
            {targetObject.targetType && <div className="text-xs"><Badge variant="outline" className="mr-2 align-middle">Type</Badge> {targetObject.targetType}</div>}
            {targetObject.writeOperation && <div className="text-xs"><Badge variant="outline" className="mr-2 align-middle">Operation/Definition</Badge> {targetObject.writeOperation}</div>}
            {targetObject.isUsedAsSourceElsewhereInBlock !== undefined && (
              <div className="text-xs"><Badge variant="outline" className="mr-2 align-middle">Used as Source?</Badge> {targetObject.isUsedAsSourceElsewhereInBlock ? "Yes" : "No"}</div>
            )}
          </>
        ) : null,
        !(targetObject && (targetObject.name || targetObject.targetType)),
        "No specific target object identified for this block."
      )}

      {renderSection("Source Tables", <PackageSearch size={18} />,
        sourceTables && sourceTables.length > 0 ? (
          <Accordion type="multiple" className="w-full">
            {sourceTables.map((table, idx) => (
              <AccordionItem value={`source-${idx}`} key={idx} className="border-border/60 last:border-b-0">
                <AccordionTrigger className="text-sm font-semibold hover:no-underline text-left text-foreground py-2">
                  {table.name} <Badge variant="secondary" className="ml-2 text-xs">{table.type}</Badge>
                </AccordionTrigger>
                <AccordionContent className="pt-1 space-y-1 pl-2">
                  <p className="text-xs text-foreground/90 leading-relaxed"><strong>Role:</strong> {table.roleDescription}</p>
                  {table.isTargetTableItself && <p className="text-xs text-muted-foreground">Note: This source is also the primary target.</p>}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : null,
        !sourceTables || sourceTables.length === 0,
        "No distinct source tables were identified."
      )}

      {renderSection("Join Analysis", <LinkIcon size={18} />,
        joinAnalysis && joinAnalysis.conditions && joinAnalysis.conditions.length > 0 ? (
          <div className="space-y-2">
            {joinAnalysis.joinsWithTargetTableExplanation && (
              <div className="text-xs text-foreground/90 p-2 bg-muted/70 rounded-md">
                <strong>Target Table Join:</strong> {joinAnalysis.joinsWithTargetTableExplanation}
              </div>
            )}
            <Accordion type="multiple" className="w-full">
              {joinAnalysis.conditions.map((join, idx) => (
                <AccordionItem value={`join-${idx}`} key={idx} className="border-border/60 last:border-b-0">
                  <AccordionTrigger className="text-sm font-semibold hover:no-underline text-left flex items-center gap-2 text-foreground py-2">
                    <Badge variant={join.joinType?.toLowerCase().includes("left") ? "outline" : join.joinType?.toLowerCase().includes("right") ? "outline" : "secondary"} className="text-xs">
                      {join.joinType || "Unknown"}
                    </Badge>
                    <span>{join.tablesInvolved}</span>
                  </AccordionTrigger>
                  <AccordionContent className="pt-1 space-y-1 pl-2">
                    <div className="text-xs text-foreground/90 leading-relaxed">
                      <strong>On:</strong>
                      <CodeBlock code={join.onCondition} className="text-xs p-1 my-1 max-h-[75px] bg-muted/70" />
                    </div>
                    <p className="text-xs text-foreground/90 leading-relaxed"><strong>Purpose:</strong> {join.purpose}</p>
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
        <Shuffle size={18} />,
        transformationRulesOrFunctionLogic && transformationRulesOrFunctionLogic.length > 0 ? (
          <Accordion type="multiple" className="w-full">
            {transformationRulesOrFunctionLogic.map((rule, idx) => (
              <AccordionItem value={`transform-${idx}`} key={idx} className="border-border/60 last:border-b-0">
                <AccordionTrigger className="text-sm font-semibold hover:no-underline text-left text-foreground py-2">
                  {rule.targetColumn || "Unnamed Transformation / Logic Step"}
                </AccordionTrigger>
                <AccordionContent className="pt-1 space-y-1 pl-2">
                  <div className="text-xs text-foreground/90">
                    <strong>Logic/Expression:</strong>
                    <CodeBlock code={rule.transformationLogic} className="text-xs p-2 my-1 max-h-[100px] bg-muted/70" />
                  </div>
                  <p className="text-xs text-foreground/90"><strong>Description:</strong> {rule.description}</p>
                  {rule.sourceColumns && rule.sourceColumns.length > 0 && (
                    <p className="text-xs text-muted-foreground">
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
          ? "No specific function logic steps were detailed."
          : "No specific data transformations identified."
      )}

      {renderSection("Filtering & Business Rules", <Filter size={18} />,
        filteringAndBusinessRules && (
          <div className="space-y-3">
            {filteringAndBusinessRules.whereClause && (
              <div>
                <h4 className="text-sm font-semibold mb-1 text-primary/95">WHERE Clause</h4>
                <CodeBlock code={filteringAndBusinessRules.whereClause} className="text-xs p-2 max-h-[100px] mb-1 bg-muted/70" />
                {filteringAndBusinessRules.whereClauseExplanation && <p className="text-xs text-foreground/90">{filteringAndBusinessRules.whereClauseExplanation}</p>}
              </div>
            )}
            {filteringAndBusinessRules.whereClause && (filteringAndBusinessRules.havingClause || (filteringAndBusinessRules.detailedConditions && filteringAndBusinessRules.detailedConditions.length > 0)) && <Separator className="my-2 bg-border/50" />}
            {filteringAndBusinessRules.havingClause && (
              <div>
                <h4 className="text-sm font-semibold mb-1 text-primary/95">HAVING Clause</h4>
                <CodeBlock code={filteringAndBusinessRules.havingClause} className="text-xs p-2 max-h-[100px] mb-1 bg-muted/70" />
                {filteringAndBusinessRules.havingClauseExplanation && <p className="text-xs text-foreground/90">{filteringAndBusinessRules.havingClauseExplanation}</p>}
              </div>
            )}
            {filteringAndBusinessRules.detailedConditions && filteringAndBusinessRules.detailedConditions.length > 0 && (
              <div className="mt-2">
                <h4 className="text-sm font-semibold mb-1 text-primary/95">Detailed Conditions</h4>
                <Accordion type="multiple" className="w-full">
                  {filteringAndBusinessRules.detailedConditions.map((cond, idx) => (
                    <AccordionItem value={`condition-${idx}`} key={idx} className="border-border/60 last:border-b-0">
                      <AccordionTrigger className="text-foreground py-2 text-sm"><Badge variant="outline" className="mr-2 text-xs">{cond.clause}</Badge> {cond.conditionSnippet.substring(0, 40)}{cond.conditionSnippet.length > 40 ? '...' : ''}</AccordionTrigger>
                      <AccordionContent className="text-foreground/90 pt-1 space-y-1 text-xs">
                        <CodeBlock code={cond.conditionSnippet} className="text-xs p-2 max-h-[75px] mb-1 bg-muted/70" />
                        <p><strong>Explanation:</strong> {cond.explanation}</p>
                        {cond.impliedBusinessRule && <p className="text-muted-foreground"><strong>Implied Rule:</strong> {cond.impliedBusinessRule}</p>}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}
            {(filteringAndBusinessRules.detailedConditions && filteringAndBusinessRules.detailedConditions.length > 0) && (filteringAndBusinessRules.windowFunctions && filteringAndBusinessRules.windowFunctions.length > 0) && <Separator className="my-2 bg-border/50" />}
            {filteringAndBusinessRules.windowFunctions && filteringAndBusinessRules.windowFunctions.length > 0 && (
              <div className="mt-2">
                <h4 className="text-sm font-semibold mb-1 text-primary/95">Window Functions</h4>
                 <Accordion type="multiple" className="w-full">
                  {filteringAndBusinessRules.windowFunctions.map((wf, idx) => (
                    <AccordionItem value={`wf-${idx}`} key={idx} className="border-border/60 last:border-b-0">
                      <AccordionTrigger className="text-foreground py-2 text-sm">{wf.functionSignature.substring(0, 50)}{wf.functionSignature.length > 50 ? '...' : ''}</AccordionTrigger>
                      <AccordionContent className="text-foreground/90 pt-1 space-y-1 text-xs">
                        <CodeBlock code={wf.functionSignature} className="text-xs p-2 max-h-[75px] mb-1 bg-muted/70" />
                        <p><strong>Purpose:</strong> {wf.purpose}</p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}
             {filteringAndBusinessRules.udfsOrProceduresUsedInFiltering && filteringAndBusinessRules.udfsOrProceduresUsedInFiltering.length > 0 && (
              <div className="mt-2">
                <h4 className="text-sm font-semibold mb-1 text-primary/95">UDFs/Procedures in Filtering</h4>
                <ul className="list-disc pl-4 text-xs space-y-1 text-foreground/90">
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
              <div className="mt-2">
                <h4 className="text-sm font-semibold mb-1 text-primary/95">Other Implied Business Rules</h4>
                <ul className="list-disc pl-4 text-xs text-foreground/90 space-y-1">
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
        "No significant filtering, window functions, or explicit business rules identified."
      )}

      {renderSection("Output Flow", <WorkflowIcon size={18} />,
        outputFlow && (
          <>
            {outputFlow.textualRepresentation && <RenderOutputFlowText flowText={outputFlow.textualRepresentation} />}
            {outputFlow.dataSources && outputFlow.dataSources.length > 0 && <div className="text-xs mt-2 text-foreground/90"><strong>Sources:</strong> {outputFlow.dataSources.join(', ')}</div>}
            {outputFlow.keyTransformationsInFlow && outputFlow.keyTransformationsInFlow.length > 0 && <div className="text-xs text-foreground/90"><strong>Key Transformations:</strong> {outputFlow.keyTransformationsInFlow.join('; ')}</div>}
            {outputFlow.dataSink && <div className="text-xs text-foreground/90"><strong>Sink/Output:</strong> {outputFlow.dataSink}</div>}
          </>
        ),
        !outputFlow || !outputFlow.textualRepresentation,
        "Output flow information not detailed."
      )}

      {renderSection("Dependencies & References", <Network size={18} />,
        dependenciesAndCrossReferences && (
          <div className="space-y-2">
            {dependenciesAndCrossReferences.externalObjectsCalledOrReferenced && dependenciesAndCrossReferences.externalObjectsCalledOrReferenced.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-1 text-primary/95">External Objects Called/Referenced</h4>
                <ul className="list-disc pl-4 text-xs space-y-1 text-foreground/90">
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
                <h4 className="text-sm font-semibold mb-1 text-primary/95">Potential Logic Overlaps</h4>
                 <Accordion type="multiple" className="w-full">
                  {dependenciesAndCrossReferences.potentialLogicOverlaps.map((overlap, idx) => (
                    <AccordionItem value={`overlap-${idx}`} key={idx} className="border-border/60 last:border-b-0">
                      <AccordionTrigger className="text-foreground py-2 text-sm">{overlap.referencedObject} {overlap.similarityPercentage !== undefined && <Badge variant="destructive" className="ml-2 text-xs">{overlap.similarityPercentage}% similar</Badge>}</AccordionTrigger>
                      <AccordionContent className="text-foreground/90 pt-1 text-xs">
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
        "No specific dependencies or cross-references identified."
      )}

      {renderSection("Code Quality & Optimization", <Construction size={18} />,
        codeQualitySuggestions && codeQualitySuggestions.suggestions && codeQualitySuggestions.suggestions.length > 0 ? (
          <div className="space-y-2">
            {codeQualitySuggestions.suggestions.map((sugg, idx) => (
              <Alert key={idx} variant={sugg.suggestionType === "Pitfall" || sugg.suggestionType === "PerformanceWarning" ? "destructive" : "default"} className="shadow-sm border-border/60 bg-card text-xs">
                {sugg.suggestionType === "Pitfall" || sugg.suggestionType === "PerformanceWarning" ? <FileWarning className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                <AlertTitle className={cn("text-xs font-semibold", (sugg.suggestionType === "Pitfall" || sugg.suggestionType === "PerformanceWarning") ? "text-destructive" : "text-primary")}>
                  {sugg.suggestionType}: {sugg.suggestion.substring(0, 40)}{sugg.suggestion.length > 40 ? '...' : ''}
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
        "No specific code quality suggestions provided."
      )}

      {renderSection("Overall Low Level Explanation", <BookCopy size={18} />,
        overallLogicExplanationForJuniorDev && <div className="text-foreground leading-relaxed whitespace-pre-wrap text-sm">{overallLogicExplanationForJuniorDev}</div>,
        !overallLogicExplanationForJuniorDev,
        "Overall explanation for junior developers not available."
      )}
    </div>
  );
};

export default DetailedExplanationDisplay;
