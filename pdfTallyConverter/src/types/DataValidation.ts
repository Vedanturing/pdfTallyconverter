export interface CellMetadata {
  error?: boolean;
  confidence?: number;
  status?: 'corrected' | 'ignored' | 'needs-review' | 'original';
  originalValue?: any;
}

export interface TableCell {
  value: any;
  metadata: CellMetadata;
}

export interface TableRow {
  [key: string]: TableCell;
  id: TableCell; // Ensure each row has an ID
}

export interface TableData {
  headers: string[];
  rows: TableRow[];
}

export interface EditHistory {
  timestamp: number;
  rowId: string;
  columnKey: string;
  oldValue: any;
  newValue: any;
}

export interface SavePayload {
  fileId: string;
  originalData: TableData;
  modifiedData: TableData;
  editHistory: EditHistory[];
} 