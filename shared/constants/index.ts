export const COMPANY_NAME = "Bilvantis Technologies";
export const APP_TITLE = "SQL Analyzer Pro";

export const BLOCK_TYPES = [
  { value: "Stored Procedure", label: "Stored Procedure" },
  { value: "View", label: "View" },
  { value: "User Defined Function", label: "User Defined Function" },
  { value: "SQL Script", label: "SQL Script" },
  { value: "Single Statement", label: "Single Statement" },
];

export type BlockTypeValue = (typeof BLOCK_TYPES)[number]["value"];

export const VISUAL_FLOW_NODE_TYPES = {
  table: "TABLE",
  view: "VIEW",
  join: "JOIN",
  filter: "FILTER",
  transform: "TRANSFORM",
  aggregate: "AGGREGATE",
  sort: "SORT",
  other: "OTHER",
  target: "TARGET",
}; 