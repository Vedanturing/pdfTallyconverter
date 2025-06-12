import React, { useState, useEffect } from 'react';
import {
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import { format, isValid, parse } from 'date-fns';

interface FinancialEntry {
  id: string;
  date: string;
  voucherNo: string;
  ledgerName: string;
  amount: number | string;
  narration: string;
}

interface ValidationError {
  type: 'required' | 'date' | 'amount' | 'duplicate';
  message: string;
}

interface CellValidation {
  isValid: boolean;
  errors: ValidationError[];
}

interface FinancialTableProps {
  data: FinancialEntry[];
  readOnly?: boolean;
  onDataChange?: (data: FinancialEntry[]) => void;
}

const FinancialTable: React.FC<FinancialTableProps> = ({
  data,
  readOnly = false,
  onDataChange,
}) => {
  const [tableData, setTableData] = useState<FinancialEntry[]>(data);
  const [validations, setValidations] = useState<{ [key: string]: { [key: string]: CellValidation } }>({});
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null);

  useEffect(() => {
    validateAllData();
  }, [tableData]);

  const validateAllData = () => {
    const newValidations: { [key: string]: { [key: string]: CellValidation } } = {};
    const voucherNos = new Set<string>();
    const duplicateVouchers = new Set<string>();

    // First pass to find duplicates
    tableData.forEach((row) => {
      if (voucherNos.has(row.voucherNo)) {
        duplicateVouchers.add(row.voucherNo);
      }
      voucherNos.add(row.voucherNo);
    });

    tableData.forEach((row) => {
      newValidations[row.id] = {
        date: validateDate(row.date),
        voucherNo: validateVoucherNo(row.voucherNo, duplicateVouchers),
        ledgerName: validateRequired(row.ledgerName, 'Ledger name'),
        amount: validateAmount(row.amount),
        narration: { isValid: true, errors: [] },
      };
    });

    setValidations(newValidations);
  };

  const validateDate = (date: string): CellValidation => {
    const errors: ValidationError[] = [];
    if (!date) {
      errors.push({ type: 'required', message: 'Date is required' });
    } else {
      const parsedDate = parse(date, 'yyyy-MM-dd', new Date());
      if (!isValid(parsedDate)) {
        errors.push({ type: 'date', message: 'Invalid date format (YYYY-MM-DD)' });
      }
    }
    return { isValid: errors.length === 0, errors };
  };

  const validateVoucherNo = (voucherNo: string, duplicates: Set<string>): CellValidation => {
    const errors: ValidationError[] = [];
    if (!voucherNo) {
      errors.push({ type: 'required', message: 'Voucher number is required' });
    }
    if (duplicates.has(voucherNo)) {
      errors.push({ type: 'duplicate', message: 'Duplicate voucher number' });
    }
    return { isValid: errors.length === 0, errors };
  };

  const validateRequired = (value: string, fieldName: string): CellValidation => {
    const errors: ValidationError[] = [];
    if (!value) {
      errors.push({ type: 'required', message: `${fieldName} is required` });
    }
    return { isValid: errors.length === 0, errors };
  };

  const validateAmount = (amount: number | string): CellValidation => {
    const errors: ValidationError[] = [];
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (isNaN(numAmount)) {
      errors.push({ type: 'required', message: 'Amount must be a number' });
    } else if (numAmount === 0) {
      errors.push({ type: 'amount', message: 'Amount cannot be zero' });
    } else if (numAmount >= 100000) {
      errors.push({ type: 'amount', message: 'Large amount detected' });
    }

    return { isValid: errors.length === 0, errors };
  };

  const handleCellEdit = (rowId: string, field: string, value: string) => {
    const newData = tableData.map((row) =>
      row.id === rowId ? { ...row, [field]: value } : row
    );
    setTableData(newData);
    onDataChange?.(newData);
  };

  const getCellClassName = (rowId: string, field: string) => {
    const validation = validations[rowId]?.[field];
    if (!validation) return '';

    const baseClasses = 'px-4 py-2 text-sm';
    if (!validation.isValid) {
      if (validation.errors.some((e) => e.type === 'required')) {
        return `${baseClasses} border-red-500 border-2`;
      }
      if (validation.errors.some((e) => e.type === 'date')) {
        return `${baseClasses} text-red-600`;
      }
      if (validation.errors.some((e) => e.type === 'amount')) {
        return `${baseClasses} bg-yellow-50`;
      }
      if (validation.errors.some((e) => e.type === 'duplicate')) {
        return `${baseClasses} border-orange-500 border-2`;
      }
    }
    return baseClasses;
  };

  const getErrorIcon = (rowId: string, field: string) => {
    const validation = validations[rowId]?.[field];
    if (!validation || validation.isValid) return null;

    if (validation.errors.some((e) => e.type === 'duplicate')) {
      return <DocumentDuplicateIcon className="h-5 w-5 text-orange-500" />;
    }
    if (validation.errors.some((e) => e.type === 'amount')) {
      return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
    }
    if (validation.errors.some((e) => e.type === 'required' || e.type === 'date')) {
      return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />;
    }
    return null;
  };

  const getValidatedData = () => {
    const validRows: FinancialEntry[] = [];
    const invalidRows: FinancialEntry[] = [];

    tableData.forEach((row) => {
      const rowValidation = validations[row.id];
      const isRowValid = Object.values(rowValidation).every((v) => v.isValid);
      if (isRowValid) {
        validRows.push(row);
      } else {
        invalidRows.push(row);
      }
    });

    return { validRows, invalidRows };
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Voucher No
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ledger Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Narration
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {tableData.map((row) => (
            <tr key={row.id}>
              {Object.entries(row).map(([key, value]) => {
                if (key === 'id') return null;
                return (
                  <td
                    key={`${row.id}-${key}`}
                    className={getCellClassName(row.id, key)}
                  >
                    <div className="flex items-center space-x-2">
                      {!readOnly && editingCell?.rowId === row.id && editingCell?.field === key ? (
                        <input
                          type={key === 'amount' ? 'number' : 'text'}
                          value={value}
                          onChange={(e) => handleCellEdit(row.id, key, e.target.value)}
                          onBlur={() => setEditingCell(null)}
                          className="w-full p-1 border rounded"
                          autoFocus
                        />
                      ) : (
                        <div
                          onClick={() => !readOnly && setEditingCell({ rowId: row.id, field: key })}
                          className={`flex-1 ${!readOnly ? 'cursor-pointer' : ''}`}
                        >
                          {value}
                        </div>
                      )}
                      {getErrorIcon(row.id, key)}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FinancialTable; 