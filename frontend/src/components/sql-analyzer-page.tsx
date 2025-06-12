// src/components/sql-analyzer-page.tsx
// Cleaned up duplicate component definitions and imports mentally first.
// The diff will target the first valid instance of components.
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
// Removed SummarizeCodeBlockOutput and ExplainSqlBlockOutput direct imports as they are now used via Shared types
// import type { ExplainSqlBlockOutput } from "@/ai/flows/explain-logic-rules"; // Now SharedExplainSqlBlockOutput
import type { ExtractTableInfoOutput, IdentifiedTable } from "@/ai/flows/extract-table-info";
// import type { SummarizeCodeBlockOutput } from "@/ai/flows/summarize-code-block"; // Now SharedSummarizeCodeBlockOutput
import { APP_TITLE, BLOCK_TYPES, BlockTypeValue, COMPANY_NAME } from "@shared/constants";
import {
  Loader2, AlertTriangle, FileTextIcon, Database, SearchCode, Code2, Table2Icon, InfoIcon,
  Lightbulb, Workflow, ListOrdered, MessageSquareQuote, Brain, Filter, LinkIcon, Shuffle,
  SortAsc, Share2, CheckCircle, ThumbsUp, SparklesIcon, Combine, Puzzle, TargetIcon,
  PackageSearch, Network, BookCopy, FileWarning, Construction, ShieldCheck, WorkflowIcon,
  ArrowDownUp, Variable, SlidersHorizontal, Download, GitCompareArrows, Columns,
  AlignLeft, SidebarClose, SidebarOpen, FileCode, PanelRightClose, PanelLeftOpen,
  ArrowLeft, ArrowRight, DatabaseZap, Sigma, PencilLine, Binary, ListTree, LayoutPanelTop, CornerDownRight, Terminal, Library, FileType, Wand2, Activity, Blocks
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
import { generateHtmlReport, generateFullHtmlReport } from "@/lib/report-generator";
import { cn } from "@/lib/utils";
import SummaryDisplay from "@/components/SummaryDisplay";
import DetailedExplanationDisplay from "@/components/DetailedExplanationDisplay";
import SecondLevelPartitionItem from "@/components/SecondLevelPartitionItem";

// Define LLM Provider options and type
const LLM_PROVIDER_OPTIONS = [
  { value: 'google-generic', label: 'Google (Gemini via AI Studio)' },
  { value: 'openai', label: 'OpenAI (GPT-4o)' },
  { value: 'vertexai', label: 'Google Vertex AI (Gemini)' },
];
export type LlmProviderValue = 'google-generic' | 'openai' | 'vertexai';


type AnalysisView = "overall_script" | "summary" | "details" | "tables" | "visual_flow" | "sub_blocks";

interface OverallScriptAnalysisDisplayProps {
  payload: FullAnalysisPayload;
  currentChunkIndex: number;
  setCurrentChunkIndex: (index: number) => void;
  setView: (view: AnalysisView) => void;
}

const OverallScriptAnalysisDisplay: React.FC<OverallScriptAnalysisDisplayProps> = ({
  payload,
  currentChunkIndex,
  setCurrentChunkIndex,
  setView
}) => {
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
          <CardTitle className="text-xl text-primary flex items-center gap-2"><ListTree size={22} />Chunk Navigation & Breakdown</CardTitle>
          <CardDescription className="text-muted-foreground">
            Select a chunk below to view its detailed analysis. Identified primary operation for each chunk is shown.
          </CardDescription>
        </CardHeader>
        <CardContent className="py-3 px-4">
          {chunkAnalyses.length > 0 ? (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground mb-2">
                {chunkAnalyses.length} chunks processed. Click a chunk to analyze.
              </div>
              <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2 rounded-md border border-border/40 p-2 bg-muted/30">
                {chunkAnalyses.map((chunk, idx) => {
                  const chunkType = chunk.detailedExplanation?.blockSummary?.identifiedType || chunk.blockType || "Unknown Type";
                  const codePreview = chunk.rawCode.substring(0, 70) + (chunk.rawCode.length > 70 ? "..." : "");
                  const isSelected = idx === currentChunkIndex;

                  return (
                    <Button
                      key={`chunk-nav-${idx}`}
                      variant={isSelected ? "secondary" : "ghost"}
                      className={cn(
                        "w-full h-auto text-left p-3 rounded-md border border-transparent transition-all duration-150 ease-in-out",
                        "flex flex-col items-start space-y-1",
                        isSelected ? "border-primary/60 shadow-md bg-primary/10 hover:bg-primary/15" : "hover:bg-muted/80 hover:border-border",
                        !isSelected && "bg-card/80"
                      )}
                      onClick={() => {
                        setCurrentChunkIndex(idx);
                        setView("summary");
                      }}
                    >
                      <div className="flex justify-between w-full items-center">
                        <span className={cn("font-semibold", isSelected ? "text-primary" : "text-foreground/90")}>
                          Chunk {chunk.chunkNumber} of {chunk.totalChunks}
                        </span>
                        <Badge variant={isSelected ? "default" : "outline"} className="text-xs">{chunkType}</Badge>
                      </div>
                      <p className={cn("text-xs text-muted-foreground font-mono", isSelected && "text-primary/80")}>
                        {codePreview}
                      </p>
                    </Button>
                  );
                })}
              </div>
            </div>
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
      "justify-start text-left h-10 px-3 py-2 rounded-md text-sm font-medium transition-colors",
      "text-sidebar-foreground hover:text-sidebar-primary hover:bg-sidebar-accent/20",
      currentView === view && "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
    )}
  >
    <span className="w-5 h-5 mr-2">{icon}</span>
    {label}
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
          <Card key={`table-card-${index}-${table.name}`} className="shadow-sm bg-card/90 border-border/70 hover:shadow-md transition-shadow">
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
                  {table.operations.map((op, opIndex) => <Badge key={`op-${index}-${table.name.replace(/\s+/g, '-')}-${opIndex}-${op}`} variant="secondary" className="text-xs bg-muted hover:bg-muted/80 text-muted-foreground">{op}</Badge>)}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
};


export default function SqlAnalyzerPage() {
  const [sqlCode, setSqlCode] = React.useState<string>("");
  const [fileName, setFileName] = React.useState<string>("");
  const [blockType, setBlockType] = React.useState<BlockTypeValue | undefined>(BLOCK_TYPES[3].value);
  // Replace 'model' state with 'selectedLlmProvider'
  const [selectedLlmProvider, setSelectedLlmProvider] = React.useState<LlmProviderValue>('google-generic');
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const [fullAnalysisPayload, setFullAnalysisPayload] = React.useState<FullAnalysisPayload | null>(null);
  const [currentChunkIndex, setCurrentChunkIndex] = React.useState<number>(0);
  const [error, setError] = React.useState<AnalysisError | null>(null);

  const [currentView, setCurrentView] = React.useState<AnalysisView>("summary");
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isRawCodePanelOpen, setIsRawCodePanelOpen] = React.useState(true);


  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Effect for loading provider from localStorage on mount
  React.useEffect(() => {
    const storedProvider = localStorage.getItem('selectedLlmProvider');
    if (storedProvider && LLM_PROVIDER_OPTIONS.some(opt => opt.value === storedProvider)) {
      setSelectedLlmProvider(storedProvider as LlmProviderValue);
    }
  }, []);

  // Effect for saving provider to localStorage when it changes
  React.useEffect(() => {
    localStorage.setItem('selectedLlmProvider', selectedLlmProvider);
  }, [selectedLlmProvider]);

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
      // Use selectedLlmProvider in the API call
      const result = await ApiClient.analyzeSQL({ sqlCode, blockType, llmProvider: selectedLlmProvider });

      if (result.chunkAnalyses.length > 0 || (result.overallScriptSummary && result.overallScriptSummary.trim() !== "" && result.overallScriptSummary !== "Overall script summary was not generated.")) {
        setFullAnalysisPayload(result);
        if (result.overallScriptSummary && result.overallScriptSummary.trim() !== "" && result.overallScriptSummary !== "Overall script summary was not generated." && (result.chunkAnalyses.length > 1 || (result.chunkAnalyses.length === 1 && blockType === "SQL Script"))) {
          setCurrentView("overall_script");
        } else if (result.chunkAnalyses.length > 0) {
          setCurrentView("summary");
        } else {
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

    const htmlContent = generateHtmlReport(currentChunkData, APP_TITLE);
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

    const htmlContent = generateFullHtmlReport(fullAnalysisPayload, APP_TITLE);
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
      return <OverallScriptAnalysisDisplay
                payload={fullAnalysisPayload}
                currentChunkIndex={currentChunkIndex}
                setCurrentChunkIndex={setCurrentChunkIndex}
                setView={setCurrentView}
             />;
    }

    if (!currentChunkData && currentView !== "overall_script") {
      if (fullAnalysisPayload.chunkAnalyses.length > 0) {
        return <p className="text-muted-foreground p-4">Select a chunk to view its analysis.</p>;
      }
      return <p className="text-muted-foreground p-4">No chunk analysis data available for this view. Try the 'Overall Script' view if available.</p>;
    }

    if (!currentChunkData) return null;


    switch (currentView) {
      case "summary":
        return <SummaryDisplay summary={currentChunkData.summary} />;
      case "details":
        return <DetailedExplanationDisplay explanation={currentChunkData.detailedExplanation} />;
      case "tables":
        return <UnifiedTableDisplay tableInfo={currentChunkData.tableInfo} />;
      case "sub_blocks":
        if (currentChunkData.secondLevelPartitions && currentChunkData.secondLevelPartitions.length > 0) {
          return (
            <div className="space-y-4">
              {currentChunkData.secondLevelPartitions.map((partition, index) => (
                <SecondLevelPartitionItem
                  key={`sub-item-${currentChunkData.chunkNumber}-${index}`}
                  partition={partition}
                  itemValue={`sub-item-${currentChunkData.chunkNumber}-${index}`}
                />
              ))}
            </div>
          );
        }
        return (
          <Card className="border-border/40 shadow bg-card">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-xl text-primary flex items-center gap-2"><Blocks size={22} />Sub-Blocks Analysis</CardTitle>
            </CardHeader>
            <CardContent className="py-3 px-4">
              <p className="text-muted-foreground text-sm flex items-center gap-2">
                <InfoIcon size={16} />
                No sub-blocks were identified or analyzed for this SQL chunk.
              </p>
            </CardContent>
          </Card>
        );
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
          <h1 className="text-5xl font-bold text-center text-primary tracking-tight">{APP_TITLE}</h1>
          <p className="text-center text-muted-foreground mt-3 max-w-2xl mx-auto text-lg">
            Paste your SQL code or upload a file.
          </p>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-8xl">
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
              {/* Repurposed the "Select AI Model" dropdown to "Select LLM Provider" */}
              <div className="grid gap-2">
                <Label htmlFor="llm-provider" className="text-sm font-medium text-foreground/90">Select LLM Provider</Label>
                <Select value={selectedLlmProvider} onValueChange={(value: LlmProviderValue) => setSelectedLlmProvider(value)}>
                  <SelectTrigger id="llm-provider" className="w-full shadow-sm focus:ring-2 focus:ring-primary/50 border-input bg-background">
                    <SelectValue placeholder="Select LLM Provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {LLM_PROVIDER_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
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
            <div className="flex flex-col gap-x-6">
              {/* Sidebar */}
              <aside className={cn(
                "w-full transition-all duration-300 ease-in-out mb-6",
                isSidebarOpen ? "h-auto" : "h-12"
              )}>
                <Card className="shadow-md border-sidebar-border bg-sidebar">
                  <CardHeader className="p-3 border-b border-sidebar-border/70 flex flex-row items-center justify-between">
                    {isSidebarOpen && <CardTitle className="text-lg text-sidebar-primary ml-1">Analysis Sections</CardTitle>}
                    {/* <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                      className={cn("text-sidebar-muted-foreground hover:text-sidebar-primary", !isSidebarOpen && "mx-auto")}
                      title={isSidebarOpen ? "Collapse Navigation" : "Expand Navigation"}
                    >
                      {isSidebarOpen ? <SidebarClose size={20} /> : <SidebarOpen size={20} />}
                    </Button> */}
                  </CardHeader>
                  <CardContent className={cn("p-3", !isSidebarOpen && "hidden")}>
                    <div className="flex flex-wrap gap-2">
                      {showOverallScriptNavItem && (
                        <SidebarNavItem view="overall_script" currentView={currentView} setView={setCurrentView} label="Overall Script" icon={<FileType size={18} />} isSidebarOpen={isSidebarOpen} />
                      )}
                      <SidebarNavItem view="summary" currentView={currentView} setView={setCurrentView} label="Chunk Summary" icon={<AlignLeft size={18} />} isSidebarOpen={isSidebarOpen} />
                      <SidebarNavItem view="details" currentView={currentView} setView={setCurrentView} label="Chunk Deep Dive" icon={<SearchCode size={18} />} isSidebarOpen={isSidebarOpen} />
                      <SidebarNavItem view="tables" currentView={currentView} setView={setCurrentView} label="Chunk Tables" icon={<Database size={18} />} isSidebarOpen={isSidebarOpen} />
                      <SidebarNavItem view="visual_flow" currentView={currentView} setView={setCurrentView} label="Chunk Visual Flow" icon={<GitCompareArrows size={18} />} isSidebarOpen={isSidebarOpen} />
                      {currentChunkData?.secondLevelPartitions && currentChunkData.secondLevelPartitions.length > 0 && (
                        <SidebarNavItem view="sub_blocks" currentView={currentView} setView={setCurrentView} label="Sub-Blocks Analysis" icon={<Blocks size={18} />} isSidebarOpen={isSidebarOpen} />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </aside>

              {/* Main Content Panes */}
              <main className={cn(
                "flex-1 grid grid-cols-1 gap-x-8 min-w-0",
                isRawCodePanelOpen ? "lg:grid-cols-[2fr_3fr]" : "lg:grid-cols-[1fr]"
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
                        {currentView === "sub_blocks" && "Sub-Blocks Analysis"}
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
          <p>&copy; {new Date().getFullYear()} {COMPANY_NAME}. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
=======
>>>>>>> REPLACE
