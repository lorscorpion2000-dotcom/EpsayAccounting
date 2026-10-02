import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';

interface Props {
  contentRef: React.RefObject<HTMLDivElement>;
  documentTitle?: string;
  className?: string;
  label?: string;
}

export default function PrintButton({
  contentRef,
  documentTitle = 'گزارش',
  className = 'btn-secondary',
  label = 'چاپ',
}: Props) {
  const handlePrint = useReactToPrint({
    content: () => contentRef.current,
    documentTitle,
    pageStyle: `
      @page {
        size: A4;
        margin: 1cm 0.8cm;
      }
      @media print {
        html, body {
          background: white !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          font-family: "Vazirmatn", Tahoma, sans-serif !important;
          direction: rtl !important;
        }
        .no-print { display: none !important; }
        .card {
          box-shadow: none !important;
          border: 1px solid #cbd5e1 !important;
        }
        table {
          width: 100% !important;
          border-collapse: collapse !important;
          font-size: 10pt !important;
        }
        table th, table td {
          border: 1px solid #cbd5e1 !important;
          padding: 6px 8px !important;
        }
        table thead th {
          background: #7C3AED !important;
          color: white !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        * {
          box-shadow: none !important;
        }
      }
    `,
  });

  return (
    <button type="button" className={className} onClick={handlePrint}>
      <Printer className="w-4 h-4" />
      {label}
    </button>
  );
}
