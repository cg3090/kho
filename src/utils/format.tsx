import React from 'react';

/** Placeholder hiển thị thay cho giá trị 0 / rỗng trong bảng và báo cáo. */
export const ZERO_DASH = '-';

const ZERO_CLASS = 'text-slate-600';

/** 0, null, undefined, '' và NaN đều bị coi là "không có giá trị" để hiển thị. */
function isBlank(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true;
  const n = typeof value === 'number' ? value : Number(value);
  return !Number.isFinite(n) || n === 0;
}

function toNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value);
}

/**
 * Định dạng số; trả về ZERO_DASH khi giá trị bằng 0 hoặc rỗng.
 * Giữ nguyên locale mặc định của trình duyệt để không đổi định dạng hiện tại.
 */
export function formatNumber(value: unknown, locale?: string | string[]): string {
  if (isBlank(value)) return ZERO_DASH;
  return toNumber(value).toLocaleString(locale);
}

/** Định dạng tiền tệ; 0 hoặc rỗng trả về ZERO_DASH (không kèm đơn vị). */
export function formatMoney(value: unknown, suffix = 'đ', locale?: string | string[]): string {
  const text = formatNumber(value, locale);
  return text === ZERO_DASH ? ZERO_DASH : `${text}${suffix}`;
}

/** Định dạng số lượng; 0 hoặc rỗng trả về ZERO_DASH. */
export function formatQty(value: unknown, locale?: string | string[]): string {
  return formatNumber(value, locale);
}

export interface NumProps {
  value: unknown;
  suffix?: string;
  /** Dấu đặt trước giá trị; bỏ trống nếu không muốn hiện dấu. */
  signed?: string;
  /** Đơn vị cần hiển thị kèm, mặc định không đơn vị (số lượng). */
  locale?: string | string[];
  className?: string;
}

/**
 * Dùng trong ô bảng / ô báo cáo: khi giá trị = 0 sẽ hiện dấu gạch ngang mờ
 * để dễ quét mắt, còn giá trị khác giữ nguyên định dạng và màu của ô.
 */
export function Num({ value, suffix = '', signed, locale, className = '' }: NumProps): React.ReactElement {
  const text = formatNumber(value, locale);
  if (text === ZERO_DASH) {
    return <span className={`${ZERO_CLASS} ${className}`.trim()}>{ZERO_DASH}</span>;
  }
  return (
    <>
      {signed}
      {text}
      {suffix}
    </>
  );
}
