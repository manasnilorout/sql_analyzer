
// src/lib/report-generator.ts
import type { SingleAnalysisResult, FullAnalysisPayload } from "@/app/actions/analysis-actions";

const escapeHtml = (text: string | undefined): string => {
  if (text === undefined || text === null) return 'N/A';
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, function (m) { return map[m]; });
};

const generateStyles = (): string => `
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; line-height: 1.6; color: #333; background-color: #f8f9fa; }
      .container { max-width: 1200px; margin: 20px auto; padding: 20px; background-color: #fff; border-radius: 8px; box-shadow: 0 0 15px rgba(0,0,0,0.1); }
      header { background-color: #4a5568; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
      header h1 { margin: 0; font-size: 2em; }
      header p { margin: 5px 0 0; font-size: 0.9em; opacity: 0.9; }
      .section { margin-bottom: 25px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 6px; background-color: #fdfdff; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
      .section h2 { font-size: 1.6em; color: #2c5282; border-bottom: 2px solid #bee3f8; padding-bottom: 8px; margin-top: 0; }
      .section h3 { font-size: 1.3em; color: #2b6cb0; margin-top: 20px; margin-bottom: 10px; }
      .code { background-color: #edf2f7; padding: 15px; border-radius: 5px; overflow-x: auto; font-family: 'Consolas', 'Courier New', monospace; font-size: 0.9em; border: 1px solid #cbd5e0; margin-top: 10px; max-height: 400px; }
      ul, ol { padding-left: 20px; }
      li { margin-bottom: 5px; }
      table { width: 100%; border-collapse: collapse; margin-top: 15px; }
      th, td { border: 1px solid #cbd5e0; padding: 10px; text-align: left; font-size: 0.9em; }
      th { background-color: #e2e8f0; color: #4a5568; font-weight: 600; }
      .badge { display: inline-block; padding: 0.25em 0.6em; font-size: 0.75em; font-weight: 700; line-height: 1; text-align: center; white-space: nowrap; vertical-align: baseline; border-radius: 0.375rem; }
      .badge-primary { color: #fff; background-color: #3182ce; }
      .badge-secondary { color: #1a202c; background-color: #e2e8f0; }
      .badge-destructive { color: #fff; background-color: #e53e3e; }
      .badge-outline { color: #4a5568; border: 1px solid #cbd5e0; }
      .flow-step { border-left: 3px solid #3182ce; padding: 10px; margin-bottom: 10px; background-color: #f0f4f8; border-radius: 0 4px 4px 0; }
      .flow-step strong { color: #2c5282; }
      .chunk-separator { border-top: 3px dashed #718096; margin: 40px 0; }
      .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 0.85em; color: #718096; }
    </style>
`;

const generateSingleChunkHtmlSection = (analysisResult: SingleAnalysisResult): string => {
  const { summary, detailedExplanation, tableInfo, logicalFlowSteps, rawCode, blockType, chunkNumber, totalChunks } = analysisResult;

  let html = `<div class="section"><h2>Raw SQL Code (Chunk ${chunkNumber} of ${totalChunks})</h2><p>Block Type Hint: ${escapeHtml(blockType)}</p><div class="code">${escapeHtml(rawCode)}</div></div>`;

  // Summary Section
  if (summary) {
    html += `
      <div class="section">
        <h2>Chunk Summary</h2>
        <h3>Main Purpose</h3>
        <p>${escapeHtml(summary.mainPurpose)}</p>
        ${summary.keyOperations && summary.keyOperations.length > 0 ? `
          <h3>Key Operations</h3>
          <ul>${summary.keyOperations.map(op => `<li>${escapeHtml(op)}</li>`).join('')}</ul>
        ` : ''}
        <h3>Data Flow</h3>
        <p>${escapeHtml(summary.dataFlow)}</p>
        ${summary.coreSqlConcepts && summary.coreSqlConcepts.length > 0 ? `
          <h3>Core SQL Concepts</h3>
          ${summary.coreSqlConcepts.map(concept => `
            <div>
              <h4>${escapeHtml(concept.concept)}</h4>
              <p>${escapeHtml(concept.explanation)}</p>
              ${concept.codeExample ? `<p>Example:</p><div class="code">${escapeHtml(concept.codeExample)}</div>` : ''}
            </div>
          `).join('')}
        ` : ''}
        ${summary.businessLogicInsights && summary.businessLogicInsights.length > 0 ? `
          <h3>Business Logic Insights</h3>
          <ul>${summary.businessLogicInsights.map(insight => `<li>${escapeHtml(insight)}</li>`).join('')}</ul>
        ` : ''}
        ${summary.beginnerFriendlyTips && summary.beginnerFriendlyTips.length > 0 ? `
          <h3>Beginner Friendly Tips</h3>
          <ul>${summary.beginnerFriendlyTips.map(tip => `<li>${escapeHtml(tip)}</li>`).join('')}</ul>
        ` : ''}
      </div>`;
  }

  // Detailed Explanation Section
  if (detailedExplanation) {
    html += `
      <div class="section">
        <h2>Chunk Deep Dive Analysis</h2>
        ${detailedExplanation.chunkKeySummary ? `<h3>Key Insights for this Chunk</h3><p>${escapeHtml(detailedExplanation.chunkKeySummary)}</p>` : ''}
        
        <h3>Block Summary</h3>
        <p><strong>Identified Type:</strong> ${escapeHtml(detailedExplanation.blockSummary?.identifiedType)}</p>
        <p><strong>Purpose:</strong> ${escapeHtml(detailedExplanation.blockSummary?.purpose)}</p>
        ${detailedExplanation.blockSummary?.inputParameters && detailedExplanation.blockSummary.inputParameters.length > 0 ? `
          <h4>Input Parameters:</h4>
          <ul>
            ${detailedExplanation.blockSummary.inputParameters.map(p => `<li><strong>${escapeHtml(p.name)}</strong> (${escapeHtml(p.dataType)}): ${escapeHtml(p.purpose)}</li>`).join('')}
          </ul>
        ` : ''}
        ${detailedExplanation.blockSummary?.functionReturnType ? `<p><strong>Function Return Type:</strong> ${escapeHtml(detailedExplanation.blockSummary.functionReturnType)}</p>` : ''}

        ${detailedExplanation.proceduralControlFlow && detailedExplanation.proceduralControlFlow.length > 0 ? `
          <h3>Procedural Control Flow</h3>
          <ol>
            ${detailedExplanation.proceduralControlFlow.map(step => `
              <li>
                <p><strong>Step ${step.stepNumber}:</strong> ${escapeHtml(step.description)}</p>
                <div class="code">${escapeHtml(step.statement)}</div>
              </li>
            `).join('')}
          </ol>
        ` : ''}

        ${detailedExplanation.targetObject ? `
          <h3>Target Object</h3>
          <p><strong>Name:</strong> ${escapeHtml(detailedExplanation.targetObject.name)}</p>
          <p><strong>Type:</strong> ${escapeHtml(detailedExplanation.targetObject.targetType)}</p>
          <p><strong>Write Operation/Definition:</strong> ${escapeHtml(detailedExplanation.targetObject.writeOperation)}</p>
          ${detailedExplanation.targetObject.isUsedAsSourceElsewhereInBlock !== undefined ? `<p><strong>Used as Source in Block:</strong> ${detailedExplanation.targetObject.isUsedAsSourceElsewhereInBlock ? 'Yes' : 'No'}</p>` : ''}
        ` : ''}

        ${detailedExplanation.sourceTables && detailedExplanation.sourceTables.length > 0 ? `
          <h3>Source Tables</h3>
          <table>
            <tr><th>Name</th><th>Type</th><th>Role Description</th><th>Is Target Itself?</th></tr>
            ${detailedExplanation.sourceTables.map(st => `
              <tr>
                <td>${escapeHtml(st.name)}</td>
                <td>${escapeHtml(st.type)}</td>
                <td>${escapeHtml(st.roleDescription)}</td>
                <td>${st.isTargetTableItself ? 'Yes' : 'No'}</td>
              </tr>
            `).join('')}
          </table>
        ` : ''}
        
        ${detailedExplanation.joinAnalysis?.conditions && detailedExplanation.joinAnalysis.conditions.length > 0 ? `
          <h3>Join Analysis</h3>
          ${detailedExplanation.joinAnalysis.joinsWithTargetTableExplanation ? `<p><strong>Join with Target Table:</strong> ${escapeHtml(detailedExplanation.joinAnalysis.joinsWithTargetTableExplanation)}</p>` : ''}
          <table>
            <tr><th>Tables Involved</th><th>Type</th><th>ON Condition</th><th>Purpose</th></tr>
            ${detailedExplanation.joinAnalysis.conditions.map(j => `
              <tr>
                <td>${escapeHtml(j.tablesInvolved)}</td>
                <td>${escapeHtml(j.joinType)}</td>
                <td><div class="code">${escapeHtml(j.onCondition)}</div></td>
                <td>${escapeHtml(j.purpose)}</td>
              </tr>
            `).join('')}
          </table>
        ` : ''}

        ${detailedExplanation.transformationRulesOrFunctionLogic && detailedExplanation.transformationRulesOrFunctionLogic.length > 0 ? `
          <h3>Transformation Rules / Function Logic</h3>
          <table>
            <tr><th>Target Column/Logic Step</th><th>Transformation Logic</th><th>Description</th><th>Source Columns</th></tr>
            ${detailedExplanation.transformationRulesOrFunctionLogic.map(t => `
              <tr>
                <td>${escapeHtml(t.targetColumn)}</td>
                <td><div class="code">${escapeHtml(t.transformationLogic)}</div></td>
                <td>${escapeHtml(t.description)}</td>
                <td>${escapeHtml(t.sourceColumns?.join(', '))}</td>
              </tr>
            `).join('')}
          </table>
        ` : ''}
        
        ${detailedExplanation.filteringAndBusinessRules ? `
          <h3>Filtering & Business Rules</h3>
          ${detailedExplanation.filteringAndBusinessRules.whereClause ? `<h4>WHERE Clause</h4><div class="code">${escapeHtml(detailedExplanation.filteringAndBusinessRules.whereClause)}</div><p>${escapeHtml(detailedExplanation.filteringAndBusinessRules.whereClauseExplanation)}</p>` : ''}
          ${detailedExplanation.filteringAndBusinessRules.havingClause ? `<h4>HAVING Clause</h4><div class="code">${escapeHtml(detailedExplanation.filteringAndBusinessRules.havingClause)}</div><p>${escapeHtml(detailedExplanation.filteringAndBusinessRules.havingClauseExplanation)}</p>` : ''}
          ${detailedExplanation.filteringAndBusinessRules.detailedConditions && detailedExplanation.filteringAndBusinessRules.detailedConditions.length > 0 ? `
            <h4>Detailed Conditions:</h4>
            <ul>${detailedExplanation.filteringAndBusinessRules.detailedConditions.map(dc => `<li><strong>${escapeHtml(dc.clause)}:</strong> <div class="code">${escapeHtml(dc.conditionSnippet)}</div> ${escapeHtml(dc.explanation)} ${dc.impliedBusinessRule ? `<em>(Implied: ${escapeHtml(dc.impliedBusinessRule)})</em>` : ''}</li>`).join('')}</ul>
          ` : ''}
          ${detailedExplanation.filteringAndBusinessRules.windowFunctions && detailedExplanation.filteringAndBusinessRules.windowFunctions.length > 0 ? `
            <h4>Window Functions:</h4>
            <ul>${detailedExplanation.filteringAndBusinessRules.windowFunctions.map(wf => `<li><div class="code">${escapeHtml(wf.functionSignature)}</div> ${escapeHtml(wf.purpose)}</li>`).join('')}</ul>
          ` : ''}
        ` : ''}

        ${detailedExplanation.outputFlow?.textualRepresentation ? `
          <h3>Output Flow</h3>
          <p>${escapeHtml(detailedExplanation.outputFlow.textualRepresentation)}</p>
          ${detailedExplanation.outputFlow.dataSources && detailedExplanation.outputFlow.dataSources.length > 0 ? `<p><strong>Sources:</strong> ${escapeHtml(detailedExplanation.outputFlow.dataSources.join(', '))}</p>`: ''}
          ${detailedExplanation.outputFlow.keyTransformationsInFlow && detailedExplanation.outputFlow.keyTransformationsInFlow.length > 0 ? `<p><strong>Key Transformations:</strong> ${escapeHtml(detailedExplanation.outputFlow.keyTransformationsInFlow.join('; '))}</p>`: ''}
          ${detailedExplanation.outputFlow.dataSink ? `<p><strong>Sink/Output:</strong> ${escapeHtml(detailedExplanation.outputFlow.dataSink)}</p>`: ''}
        ` : ''}
        
        ${detailedExplanation.dependenciesAndCrossReferences?.externalObjectsCalledOrReferenced && detailedExplanation.dependenciesAndCrossReferences.externalObjectsCalledOrReferenced.length > 0 ? `
          <h3>Dependencies & External References</h3>
          <ul>
            ${detailedExplanation.dependenciesAndCrossReferences.externalObjectsCalledOrReferenced.map(dep => `<li><strong>${escapeHtml(dep.objectName)}</strong> (${escapeHtml(dep.objectType)}): ${escapeHtml(dep.usageContext)}. ${dep.inferredPurpose ? `<em>Purpose: ${escapeHtml(dep.inferredPurpose)}</em>` : ''}</li>`).join('')}
          </ul>
        ` : ''}

        ${detailedExplanation.codeQualitySuggestions?.suggestions && detailedExplanation.codeQualitySuggestions.suggestions.length > 0 ? `
          <h3>Code Quality & Optimization</h3>
          <ul>
            ${detailedExplanation.codeQualitySuggestions.suggestions.map(sugg => `<li><strong>${escapeHtml(sugg.suggestionType)}:</strong> ${escapeHtml(sugg.suggestion)} ${sugg.reasoning ? `<em>(${escapeHtml(sugg.reasoning)})</em>` : ''}</li>`).join('')}
          </ul>
        ` : ''}
        
        ${detailedExplanation.overallLogicExplanationForJuniorDev ? `
          <h3>Overall Explanation for Junior Developers</h3>
          <p>${escapeHtml(detailedExplanation.overallLogicExplanationForJuniorDev)}</p>
        ` : ''}
      </div>`;
  }

  // Table Info Section
  if (tableInfo && tableInfo.identifiedTables.length > 0) {
    html += `
      <div class="section">
        <h2>Chunk Table Analysis</h2>
        <table>
          <tr><th>Name</th><th>Primary Role</th><th>Role Description</th><th>Operations</th></tr>
          ${tableInfo.identifiedTables.map(table => `
            <tr>
              <td>${escapeHtml(table.name)}</td>
              <td>${escapeHtml(table.primaryRole)}</td>
              <td>${escapeHtml(table.roleDescription)}</td>
              <td>${escapeHtml(table.operations?.join(', '))}</td>
            </tr>
          `).join('')}
        </table>
      </div>`;
  }

  // Visual Flow Section
  if (logicalFlowSteps && logicalFlowSteps.flowSteps.length > 0) {
    html += `
      <div class="section">
        <h2>Chunk Visual Flow Steps</h2>
        ${logicalFlowSteps.flowSteps.map(step => `
          <div class="flow-step">
            <strong>${escapeHtml(step.id)}: ${escapeHtml(step.title)}</strong> (${escapeHtml(step.type)})
            <p>${escapeHtml(step.description)}</p>
            ${step.sqlReference ? `<p>SQL Reference:</p><div class="code">${escapeHtml(step.sqlReference)}</div>` : ''}
          </div>
        `).join('')}
      </div>`;
  }
  return html;
};

export const generateFullHtmlReport = (fullPayload: FullAnalysisPayload, appName: string): string => {
  const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
  let reportHtml = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(appName)} - Full SQL Script Analysis Report - ${timestamp}</title>
    ${generateStyles()}
  </head>
  <body>
    <div class="container">
      <header>
        <h1>${escapeHtml(appName)}</h1>
        <p>Full SQL Script Analysis Report - Generated on ${timestamp}</p>
      </header>
  `;

  // Full SQL Code Section
  reportHtml += `
    <div class="section">
      <h2>Full SQL Script Provided</h2>
      <div class="code">${escapeHtml(fullPayload.originalFullSqlCode)}</div>
    </div>
  `;

  // Overall Script Summary Section
  if (fullPayload.overallScriptSummary && fullPayload.overallScriptSummary.trim() !== "" && fullPayload.overallScriptSummary !== "Overall script summary was not generated.") {
    reportHtml += `
      <div class="section">
        <h2>Overall Script Summary</h2>
        <p>${escapeHtml(fullPayload.overallScriptSummary)}</p>
      </div>
    `;
  }

  // Individual Chunk Analyses
  if (fullPayload.chunkAnalyses && fullPayload.chunkAnalyses.length > 0) {
    fullPayload.chunkAnalyses.forEach((chunkAnalysis, index) => {
      if (index > 0) {
        reportHtml += `<div class="chunk-separator"></div>`;
      }
      reportHtml += `<div class="section"><h2>Analysis for Chunk ${chunkAnalysis.chunkNumber} of ${chunkAnalysis.totalChunks}</h2></div>`;
      reportHtml += generateSingleChunkHtmlSection(chunkAnalysis);
    });
  } else {
    reportHtml += `<div class="section"><p>No individual chunk analyses were performed or available.</p></div>`;
  }


  reportHtml += `
      <div class="footer">
        <p>Report generated by ${escapeHtml(appName)}</p>
      </div>
    </div>
  </body>
  </html>
  `;
  return reportHtml;
};

// Re-exporting the single chunk report generator for potential individual use if ever needed, though it's primarily internal now.
// The main export for chunk reports from the UI will still be handled by a function that calls this with a single SingleAnalysisResult.
// For clarity, the old generateHtmlReport is effectively replaced by generateFullHtmlReport for full reports
// and the logic for single chunk is encapsulated in generateSingleChunkHtmlSection.
// If the UI needs to export a single chunk, it should prepare a temporary FullAnalysisPayload with just that one chunk
// or we could expose a dedicated function for it.
// For now, let's keep the original name for the UI export of a single chunk.
export const generateHtmlReport = (analysisResult: SingleAnalysisResult, appName: string): string => {
   const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
   const chunkInfo = analysisResult.totalChunks > 1 ? `Chunk ${analysisResult.chunkNumber} of ${analysisResult.totalChunks}` : "Single Block";
   let reportHtml = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(appName)} - ${escapeHtml(chunkInfo)} Analysis Report - ${timestamp}</title>
    ${generateStyles()}
  </head>
  <body>
    <div class="container">
      <header>
        <h1>${escapeHtml(appName)}</h1>
        <p>${escapeHtml(chunkInfo)} Analysis Report (${escapeHtml(analysisResult.blockType)}) - Generated on ${timestamp}</p>
      </header>
  `;
  reportHtml += generateSingleChunkHtmlSection(analysisResult);
  reportHtml += `
      <div class="footer">
        <p>Report generated by ${escapeHtml(appName)}</p>
      </div>
    </div>
  </body>
  </html>
  `;
  return reportHtml;

}
