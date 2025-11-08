import React from 'react';

interface Column<T> {
  header: string;
  accessor: (item: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface Props<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string | number;
  footer?: React.ReactNode;
  onRowClick?: (item: T) => void;
}

// Generic spreadsheet component to maintain consistent Excel-like look
function Spreadsheet<T>({ data, columns, keyExtractor, footer, onRowClick }: Props<T>) {
  return (
    <div className="min-w-full inline-block align-middle">
      <div className="border border-gray-300 bg-white">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr className="divide-x divide-gray-300">
              {columns.map((col, index) => (
                <th
                  key={index}
                  scope="col"
                  className={`px-2 py-2 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider bg-gray-100 border-b-2 border-gray-300 ${col.headerClassName || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data.length === 0 ? (
               <tr>
                 <td colSpan={columns.length} className="px-3 py-8 text-center text-sm text-gray-500 italic">
                   Nenhum registro encontrado.
                 </td>
               </tr>
            ) : (
                data.map((item, rowIndex) => (
                <tr 
                    key={keyExtractor(item)} 
                    onClick={() => onRowClick && onRowClick(item)}
                    className={`divide-x divide-gray-200 ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${onRowClick ? 'cursor-pointer hover:bg-blue-100 transition-colors' : 'hover:bg-blue-50'}`}
                >
                    {columns.map((col, colIndex) => (
                    <td key={colIndex} className={`px-2 py-2 text-sm text-gray-800 whitespace-nowrap ${col.className || ''}`}>
                        {col.accessor(item)}
                    </td>
                    ))}
                </tr>
                ))
            )}
          </tbody>
           {footer && (
               <tfoot className="bg-gray-50 sticky bottom-0 z-10 border-t-2 border-gray-300 shadow-[0_-2px_5px_rgba(0,0,0,0.05)]">
                   <tr>
                       <td colSpan={columns.length} className="p-2">
                           {footer}
                       </td>
                   </tr>
               </tfoot>
           )}
        </table>
      </div>
    </div>
  );
}

export default Spreadsheet;