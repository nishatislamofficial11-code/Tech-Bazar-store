import React from 'react';
import {
  DatePicker as AriaDatePicker,
  DatePickerProps as AriaDatePickerProps,
  DateRangePicker as AriaDateRangePicker,
  DateRangePickerProps as AriaDateRangePickerProps,
  DateValue,
  Label,
  Button,
  Dialog,
  Popover,
  Calendar,
  RangeCalendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridHeader,
  CalendarHeaderCell,
  CalendarGridBody,
  DateInput,
  DateSegment,
  Group,
  Heading
} from 'react-aria-components';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

export interface DatePickerProps extends AriaDatePickerProps<DateValue> {
  label?: string;
  hint?: string;
  error?: string;
}

export function DatePicker({ label, hint, error, ...props }: DatePickerProps) {
  return (
    <AriaDatePicker {...props} className="flex flex-col gap-1.5 w-full relative">
      {label && <Label className="text-sm font-medium text-slate-700">{label}</Label>}
      
      <Group className={`
        flex items-center w-full px-3.5 py-2.5 bg-white border rounded-lg shadow-sm transition-all focus-within:ring-4
        ${error ? 'border-red-300 focus-within:border-red-300 focus-within:ring-red-100' : 'border-slate-200 focus-within:border-slate-300 focus-within:ring-slate-50'}
      `}>
        <DateInput className="flex-1 flex text-[13px] text-slate-900 font-medium bg-transparent focus:outline-none">
          {(segment) => (
            <DateSegment
              segment={segment}
              className="px-0.5 rounded focus:bg-slate-900 focus:text-white outline-none placeholder-slate-400 caret-transparent"
            />
          )}
        </DateInput>
        <Button className="outline-none shrink-0 text-slate-400 hover:text-slate-600 transition-colors ml-2">
          <CalendarIcon className="w-4 h-4" strokeWidth={2.5} />
        </Button>
      </Group>

      {(hint || error) && (
        <p className={`text-sm ${error ? 'text-red-500' : 'text-slate-500'}`}>
          {error || hint}
        </p>
      )}

      <Popover className="z-[9999] bg-white border border-slate-200 rounded-xl shadow-2xl p-4 w-[280px] isolate">
        <Dialog className="outline-none">
          <Calendar>
            <header className="flex items-center justify-between pb-3 w-full">
              <Button slot="previous" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-600 outline-none transition-colors border border-transparent hover:border-slate-200">
                <ChevronLeft className="w-4 h-4" strokeWidth={2} />
              </Button>
              <Heading className="text-[14px] font-semibold text-slate-900" />
              <Button slot="next" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-600 outline-none transition-colors border border-transparent hover:border-slate-200">
                <ChevronRight className="w-4 h-4" strokeWidth={2} />
              </Button>
            </header>
            
            <CalendarGrid className="w-full border-collapse">
              <CalendarGridHeader>
                {(day) => (
                  <CalendarHeaderCell className="text-xs text-slate-500 font-medium pb-2 text-center w-9">
                    {day}
                  </CalendarHeaderCell>
                )}
              </CalendarGridHeader>
              <CalendarGridBody>
                {(date) => (
                  <CalendarCell
                    date={date}
                    className={({ isSelected, isOutsideVisibleRange, isDisabled, isUnavailable }) => `
                      w-9 h-9 flex items-center justify-center rounded-full cursor-pointer outline-none transition-colors text-[13px] font-medium m-0.5
                      ${isOutsideVisibleRange || isUnavailable ? 'text-slate-300' : 'text-slate-700'}
                      ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100'}
                      ${isSelected ? 'bg-slate-900 text-white font-semibold shadow-sm hover:bg-slate-800' : ''}
                    `}
                  />
                )}
              </CalendarGridBody>
            </CalendarGrid>
          </Calendar>
        </Dialog>
      </Popover>
    </AriaDatePicker>
  );
}

export interface DateRangePickerProps extends AriaDateRangePickerProps<DateValue> {
  label?: string;
  hint?: string;
  error?: string;
  className?: string;
}

export function DateRangePicker({ label, hint, error, className, ...props }: DateRangePickerProps) {
  return (
    <AriaDateRangePicker {...props} className={`flex flex-col gap-1.5 w-full relative ${className || ''}`}>
      {label && <Label className="text-sm font-medium text-slate-700">{label}</Label>}
      
      <Group className={`
        flex items-center w-full px-3.5 py-2.5 bg-white border rounded-lg shadow-sm transition-all focus-within:ring-4
        ${error ? 'border-red-300 focus-within:border-red-300 focus-within:ring-red-100' : 'border-slate-200 focus-within:border-slate-300 focus-within:ring-slate-50'}
      `}>
        <DateInput slot="start" className="flex text-[13px] text-slate-900 font-medium bg-transparent focus:outline-none">
          {(segment) => (
            <DateSegment
              segment={segment}
              className="px-0.5 rounded focus:bg-slate-900 focus:text-white outline-none placeholder-slate-400 caret-transparent"
            />
          )}
        </DateInput>
        <span aria-hidden="true" className="mx-2 text-slate-400 text-xs">-</span>
        <DateInput slot="end" className="flex flex-1 text-[13px] text-slate-900 font-medium bg-transparent focus:outline-none">
          {(segment) => (
            <DateSegment
              segment={segment}
              className="px-0.5 rounded focus:bg-slate-900 focus:text-white outline-none placeholder-slate-400 caret-transparent"
            />
          )}
        </DateInput>
        <Button className="outline-none shrink-0 text-slate-400 hover:text-slate-600 transition-colors ml-2">
          <CalendarIcon className="w-4 h-4" strokeWidth={2.5} />
        </Button>
      </Group>

      {(hint || error) && (
        <p className={`text-sm ${error ? 'text-red-500' : 'text-slate-500'}`}>
          {error || hint}
        </p>
      )}

      <Popover className="z-[9999] bg-white border border-slate-200 rounded-xl shadow-2xl p-4 w-[280px] isolate">
        <Dialog className="outline-none">
          <RangeCalendar>
            <header className="flex items-center justify-between pb-3 w-full">
              <Button slot="previous" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-600 outline-none transition-colors border border-transparent hover:border-slate-200">
                <ChevronLeft className="w-4 h-4" strokeWidth={2} />
              </Button>
              <Heading className="text-[14px] font-semibold text-slate-900" />
              <Button slot="next" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-600 outline-none transition-colors border border-transparent hover:border-slate-200">
                <ChevronRight className="w-4 h-4" strokeWidth={2} />
              </Button>
            </header>
            
            <CalendarGrid className="w-full border-collapse">
              <CalendarGridHeader>
                {(day) => (
                  <CalendarHeaderCell className="text-xs text-slate-500 font-medium pb-2 text-center w-9">
                    {day}
                  </CalendarHeaderCell>
                )}
              </CalendarGridHeader>
              <CalendarGridBody>
                {(date) => (
                  <CalendarCell
                    date={date}
                    className={({ isSelected, isSelectionStart, isSelectionEnd, isOutsideVisibleRange, isDisabled, isUnavailable }) => `
                      w-9 h-9 flex items-center justify-center outline-none transition-colors text-[13px] font-medium cursor-pointer relative
                      ${isOutsideVisibleRange || isUnavailable ? 'text-slate-300' : 'text-slate-700'}
                      ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100 rounded-full'}
                      ${isSelected && !isSelectionStart && !isSelectionEnd ? 'bg-indigo-50 text-indigo-700 rounded-none' : ''}
                      ${isSelected && isSelectionStart && !isSelectionEnd ? 'bg-indigo-50 rounded-l-full rounded-r-none' : ''}
                      ${isSelected && isSelectionEnd && !isSelectionStart ? 'bg-indigo-50 rounded-r-full rounded-l-none' : ''}
                      ${isSelected && isSelectionStart && isSelectionEnd ? 'rounded-full' : ''}
                    `}
                  >
                    {({ formattedDate, isSelected, isSelectionStart, isSelectionEnd }) => (
                      <div className={`w-full h-full flex items-center justify-center rounded-full ${isSelected && (isSelectionStart || isSelectionEnd) ? 'bg-slate-900 text-white shadow-sm hover:bg-slate-800' : ''}`}>
                        {formattedDate}
                      </div>
                    )}
                  </CalendarCell>
                )}
              </CalendarGridBody>
            </CalendarGrid>
          </RangeCalendar>
        </Dialog>
      </Popover>
    </AriaDateRangePicker>
  );
}
