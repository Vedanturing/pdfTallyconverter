import React, { useState, useCallback, useRef, useEffect } from 'react';
import { TableData, TableCell, EditHistory } from '../../types/DataValidation';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { API_URL } from '../../config';
import EditableTable from './EditableTable';
import DiffModal from './DiffModal';
import ExportButtons from './ExportButtons';
import UndoRedoButtons from './UndoRedoButtons';
import { 
  ArrowDownTrayIcon, 
  ArrowUpTrayIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  ArrowPathIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface Props {
  initialData: TableData;
  fileId: string;
}

interface ValidationError {
  rowId: string;
  columnKey: string;
  type: 'format' | 'range' | 'missing' | 'duplicate';
  message: string;
}

interface ValidationRules {
  [columnKey: string]: {
    type?: 'number' | 'date' | 'text';
    required?: boolean;
    minValue?: number;
    maxValue?: number;
    format?: string;
    unique?: boolean;
  };
}

const DataValidationPanel: React.FC<Props> = ({ initialData, fileId }) => {
  const [data, setData] = useState<TableData>(initialData);
  const [history, setHistory] = useState<EditHistory[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [validationRules, setValidationRules] = useState<ValidationRules>({});
  const [selectedError, setSelectedError] = useState<ValidationError | null>(null);
  const [showRulesEditor, setShowRulesEditor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Track original data for diff view
  const originalData = useRef(initialData);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const validateData = useCallback(() => {
    const errors: ValidationError[] = [];
    const uniqueValues: { [key: string]: Set<string> } = {};

    data.rows.forEach(row => {
      Object.entries(row).forEach(([columnKey, cell]) => {
        if (columnKey === 'id') return;
        const rules = validationRules[columnKey];
        if (!rules) return;

        const value = cell.value.toString();

        // Check required
        if (rules.required && !value) {
          errors.push({
            rowId: row.id.value,
            columnKey,
            type: 'missing',
            message: `${columnKey} is required`
          });
        }

        // Check type and format
        if (rules.type === 'number') {
          const numValue = Number(value);
          if (isNaN(numValue)) {
            errors.push({
              rowId: row.id.value,
              columnKey,
              type: 'format',
              message: `${columnKey} must be a number`
            });
          } else {
            if (rules.minValue !== undefined && numValue < rules.minValue) {
              errors.push({
                rowId: row.id.value,
                columnKey,
                type: 'range',
                message: `${columnKey} must be at least ${rules.minValue}`
              });
            }
            if (rules.maxValue !== undefined && numValue > rules.maxValue) {
              errors.push({
                rowId: row.id.value,
                columnKey,
                type: 'range',
                message: `${columnKey} must be at most ${rules.maxValue}`
              });
            }
          }
        }

        // Check uniqueness
        if (rules.unique) {
          if (!uniqueValues[columnKey]) {
            uniqueValues[columnKey] = new Set();
          }
          if (uniqueValues[columnKey].has(value)) {
            errors.push({
              rowId: row.id.value,
              columnKey,
              type: 'duplicate',
              message: `Duplicate value in ${columnKey}`
            });
          }
          uniqueValues[columnKey].add(value);
        }
      });
    });

    setValidationErrors(errors);
    return errors.length === 0;
  }, [data, validationRules]);

  const handleCellEdit = useCallback((rowId: string, columnKey: string, newValue: any) => {
    setData(prevData => {
      const newData = JSON.parse(JSON.stringify(prevData));
      const row = newData.rows.find(r => r.id.value === rowId);
      if (!row) return prevData;

      const oldValue = row[columnKey].value;
      row[columnKey] = {
        value: newValue,
        metadata: {
          ...row[columnKey].metadata,
          status: 'corrected',
          originalValue: row[columnKey].metadata.originalValue ?? oldValue
        }
      };

      // Add to history
      const newHistory = {
        timestamp: Date.now(),
        rowId,
        columnKey,
        oldValue,
        newValue
      };

      setHistory(prev => [...prev.slice(0, historyIndex + 1), newHistory]);
      setHistoryIndex(prev => prev + 1);

      return newData;
    });
  }, [historyIndex]);

  const handleImportRules = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rules = JSON.parse(e.target?.result as string);
        setValidationRules(rules);
        toast.success('Validation rules imported successfully');
        validateData();
      } catch (error) {
        toast.error('Failed to import validation rules');
      }
    };
    reader.readAsText(file);
  };

  const handleExportRules = () => {
    const rulesBlob = new Blob([JSON.stringify(validationRules, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(rulesBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'validation_rules.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportValidation = () => {
    const validationReport = {
      data,
      errors: validationErrors,
      rules: validationRules,
      history
    };
    const reportBlob = new Blob([JSON.stringify(validationReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(reportBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'validation_report.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportValidation = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const report = JSON.parse(e.target?.result as string);
        setData(report.data);
        setValidationErrors(report.errors);
        setValidationRules(report.rules);
        setHistory(report.history);
        setHistoryIndex(report.history.length - 1);
        toast.success('Validation report imported successfully');
      } catch (error) {
        toast.error('Failed to import validation report');
      }
    };
    reader.readAsText(file);
  };

  const handleAddRule = (columnKey: string) => {
    setValidationRules(prev => ({
      ...prev,
      [columnKey]: {
        type: 'text',
        required: false,
        unique: false
      }
    }));
  };

  const handleUpdateRule = (columnKey: string, updates: Partial<ValidationRules[string]>) => {
    setValidationRules(prev => ({
      ...prev,
      [columnKey]: {
        ...prev[columnKey],
        ...updates
      }
    }));
  };

  const handleStatusChange = useCallback((rowId: string, columnKey: string, status: 'corrected' | 'ignored' | 'needs-review') => {
    setData(prevData => {
      const newData = JSON.parse(JSON.stringify(prevData));
      const row = newData.rows.find(r => r.id.value === rowId);
      if (!row) return prevData;

      row[columnKey] = {
        ...row[columnKey],
        metadata: {
          ...row[columnKey].metadata,
          status
        }
      };

      return newData;
    });
  }, []);

  const handleSave = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/save-edits`, {
        fileId,
        originalData: originalData.current,
        modifiedData: data,
        editHistory: history
      });

      if (response.data.status === 'success') {
        toast.success('Changes saved successfully');
      } else {
        throw new Error(response.data.message || 'Failed to save changes');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save changes');
    }
  };

  const handleDownload = async (format: string) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/download/${fileId}/${format}`,
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `validated_data.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Downloaded ${format.toUpperCase()} successfully`);
    } catch (error) {
      toast.error(`Failed to download ${format.toUpperCase()}`);
    }
  };

  const handleUndo = useCallback(() => {
    if (historyIndex >= 0) {
      const edit = history[historyIndex];
      setData(prevData => {
        const newData = JSON.parse(JSON.stringify(prevData));
        const row = newData.rows.find(r => r.id.value === edit.rowId);
        if (!row) return prevData;

        row[edit.columnKey] = {
          value: edit.oldValue,
          metadata: {
            ...row[edit.columnKey].metadata,
            status: 'original'
          }
        };

        return newData;
      });
      setHistoryIndex(prev => prev - 1);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const edit = history[historyIndex + 1];
      setData(prevData => {
        const newData = JSON.parse(JSON.stringify(prevData));
        const row = newData.rows.find(r => r.id.value === edit.rowId);
        if (!row) return prevData;

        row[edit.columnKey] = {
          value: edit.newValue,
          metadata: {
            ...row[edit.columnKey].metadata,
            status: 'corrected'
          }
        };

        return newData;
      });
      setHistoryIndex(prev => prev + 1);
    }
  }, [history, historyIndex]);

  const handleShowDiff = (edit: EditHistory) => {
    setSelectedError(null);
    setShowDiffModal(true);
  };

  return (
    <div className="p-4 max-w-full">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <UndoRedoButtons 
            canUndo={historyIndex >= 0}
            canRedo={historyIndex < history.length - 1}
            onUndo={handleUndo}
            onRedo={handleRedo}
          />
          <button
            onClick={() => setShowDiffModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            View Changes
          </button>
        </div>

        <div className="flex items-center space-x-4">
          {/* Rules Management */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowRulesEditor(!showRulesEditor)}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center"
            >
              <PencilIcon className="h-5 w-5 mr-2" />
              Edit Rules
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center"
            >
              <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
              Import Rules
            </button>
            <button
              onClick={handleExportRules}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center"
            >
              <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
              Export Rules
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportRules}
              accept=".json"
              className="hidden"
            />
          </div>

          {/* Validation Report */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json';
                input.onchange = (e) => handleImportValidation(e as any);
                input.click();
              }}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center"
            >
              <DocumentDuplicateIcon className="h-5 w-5 mr-2" />
              Import Validation
            </button>
            <button
              onClick={handleExportValidation}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center"
            >
              <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
              Export Validation
            </button>
          </div>

          {/* Download Buttons */}
          <div className="flex items-center space-x-2">
            {['xlsx', 'csv', 'xml'].map((format) => (
              <button
                key={format}
                onClick={() => handleDownload(format)}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                Download {format.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Rules Editor Modal */}
      {showRulesEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Validation Rules Editor</h3>
            <div className="space-y-4">
              {data.headers.map(header => (
                header !== 'id' && (
                  <div key={header} className="border p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{header}</h4>
                      {!validationRules[header] ? (
                        <button
                          onClick={() => handleAddRule(header)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          Add Rule
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            const newRules = { ...validationRules };
                            delete newRules[header];
                            setValidationRules(newRules);
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove Rule
                        </button>
                      )}
                    </div>
                    {validationRules[header] && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-4">
                          <select
                            value={validationRules[header].type}
                            onChange={(e) => handleUpdateRule(header, { type: e.target.value as any })}
                            className="border rounded px-2 py-1"
                          >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="date">Date</option>
                          </select>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={validationRules[header].required}
                              onChange={(e) => handleUpdateRule(header, { required: e.target.checked })}
                              className="mr-2"
                            />
                            Required
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={validationRules[header].unique}
                              onChange={(e) => handleUpdateRule(header, { unique: e.target.checked })}
                              className="mr-2"
                            />
                            Unique
                          </label>
                        </div>
                        {validationRules[header].type === 'number' && (
                          <div className="flex items-center space-x-4">
                            <label className="flex items-center">
                              Min:
                              <input
                                type="number"
                                value={validationRules[header].minValue ?? ''}
                                onChange={(e) => handleUpdateRule(header, { minValue: Number(e.target.value) })}
                                className="border rounded px-2 py-1 ml-2 w-24"
                              />
                            </label>
                            <label className="flex items-center">
                              Max:
                              <input
                                type="number"
                                value={validationRules[header].maxValue ?? ''}
                                onChange={(e) => handleUpdateRule(header, { maxValue: Number(e.target.value) })}
                                className="border rounded px-2 py-1 ml-2 w-24"
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              ))}
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowRulesEditor(false);
                  validateData();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save & Validate
              </button>
              <button
                onClick={() => setShowRulesEditor(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation Errors Panel */}
      {validationErrors.length > 0 && (
        <div className="mb-4 p-4 bg-red-50 rounded-lg">
          <h3 className="text-lg font-semibold text-red-700 mb-2">
            Validation Errors ({validationErrors.length})
          </h3>
          <div className="space-y-2">
            {validationErrors.map((error, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-white rounded border border-red-200"
              >
                <div className="flex items-center">
                  <ExclamationCircleIcon className="h-5 w-5 text-red-500 mr-2" />
                  <span>
                    Row {error.rowId}: {error.message}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedError(error)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Fix
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <EditableTable
        data={data}
        onCellEdit={handleCellEdit}
        onStatusChange={handleStatusChange}
        validationErrors={validationErrors}
        selectedError={selectedError}
        onShowDiff={handleShowDiff}
      />

      {showDiffModal && (
        <DiffModal
          originalData={originalData.current}
          modifiedData={data}
          onClose={() => setShowDiffModal(false)}
        />
      )}
    </div>
  );
};

export default DataValidationPanel; 