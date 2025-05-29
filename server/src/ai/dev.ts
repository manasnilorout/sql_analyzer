
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-example-query.ts';
import '@/ai/flows/explain-logic-rules.ts';
import '@/ai/flows/summarize-code-block.ts';
import '@/ai/flows/extract-table-info.ts';
import '@/ai/flows/generate-sql-logical-flow.ts';
import '@/ai/flows/summarize-entire-script.ts'; // Added new flow
