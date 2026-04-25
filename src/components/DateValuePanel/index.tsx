import { useEffect, useState } from 'react'
import Button from 'antd/es/button'
import Calendar from 'antd/es/calendar'
import Checkbox from 'antd/es/checkbox'
import DatePicker from 'antd/es/date-picker'
import Divider from 'antd/es/divider'
import TimePicker from 'antd/es/time-picker'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import {
  LeftOutlined,
  ReloadOutlined,
  RightOutlined,
} from '@ant-design/icons'
import './index.less'

type CalendarViewMode = 'month' | 'year'

export function isTimeDetailEnabled(value: Dayjs | null): boolean {
  return Boolean(value && !value.startOf('day').isSame(value))
}

export function applyDateValueDetail(
  value: Dayjs | null,
  showTimeToggle: boolean,
  timeValue?: Dayjs | null,
): Dayjs | null {
  if (!value) {
    return null
  }
  if (!showTimeToggle) {
    return value.startOf('day')
  }
  const nextTime = timeValue ?? value
  return value
    .hour(nextTime.hour())
    .minute(nextTime.minute())
    .second(0)
    .millisecond(0)
}

export function formatDateValueLabel(value: Dayjs | null): string {
  if (!value) {
    return ''
  }
  return isTimeDetailEnabled(value) ? value.format('M月D日 HH:mm') : value.format('M月D日')
}

export interface DateValuePanelProps {
  value: Dayjs | null
  showTimeToggle: boolean
  datePlaceholder: string
  timePlaceholder?: string
  onChange: (value: Dayjs | null) => void
  onShowTimeToggle: (checked: boolean) => void
  onClear?: () => void
  disabledDate?: (current: Dayjs) => boolean
}

export default function DateValuePanel({
  value,
  showTimeToggle,
  datePlaceholder,
  timePlaceholder = '截止日期',
  onChange,
  onShowTimeToggle,
  onClear,
  disabledDate,
}: DateValuePanelProps) {
  const [calendarValue, setCalendarValue] = useState<Dayjs>(value ?? dayjs())
  const [calendarMode, setCalendarMode] = useState<CalendarViewMode>('month')

  useEffect(() => {
    if (value) {
      setCalendarValue(value)
    }
  }, [value])

  const handleDateChange = (nextValue: Dayjs | null) => {
    if (!nextValue) {
      onChange(null)
      return
    }
    setCalendarValue(nextValue)
    onChange(applyDateValueDetail(nextValue, showTimeToggle, value))
  }

  const handleTimeChange = (nextValue: Dayjs | null) => {
    if (!value) {
      return
    }
    onChange(applyDateValueDetail(value, true, nextValue))
  }

  const handleToggleChange = (checked: boolean) => {
    onShowTimeToggle(checked)
    if (!value) {
      return
    }
    onChange(applyDateValueDetail(value, checked, value))
  }

  return (
    <div className="date-value-panel" onMouseDown={(event) => event.preventDefault()}>
      <Calendar
        fullscreen={false}
        value={calendarValue}
        mode={calendarMode}
        disabledDate={disabledDate}
        onSelect={(nextValue) => handleDateChange(nextValue)}
        onPanelChange={(nextValue, mode) => {
          setCalendarValue(nextValue)
          setCalendarMode(mode)
        }}
        headerRender={({ value: headerValue, type, onTypeChange }) => (
          <div className="date-value-panel-header">
            <Button
              type="text"
              size="small"
              icon={<LeftOutlined />}
              onClick={() => setCalendarValue(
                headerValue.clone().subtract(1, type === 'year' ? 'year' : 'month'),
              )}
            />
            <span
              className="date-value-panel-title"
              role="button"
              tabIndex={0}
              onClick={() => onTypeChange(type === 'month' ? 'year' : 'month')}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onTypeChange(type === 'month' ? 'year' : 'month')
                }
              }}
            >
              {headerValue.format('YYYY年 M月')}
            </span>
            <Button
              type="text"
              size="small"
              icon={<RightOutlined />}
              onClick={() => setCalendarValue(
                headerValue.clone().add(1, type === 'year' ? 'year' : 'month'),
              )}
            />
          </div>
        )}
      />
      <div className="date-value-panel-inputs">
        <DatePicker
          value={value}
          inputReadOnly
          format="YYYY/MM/DD"
          placeholder={datePlaceholder}
          disabledDate={disabledDate}
          className="date-value-panel-input"
          getPopupContainer={(triggerNode) => triggerNode.parentElement ?? document.body}
          onChange={handleDateChange}
        />
        <div className="date-value-time-row">
          <TimePicker
            value={value}
            inputReadOnly
            format="HH:mm"
            minuteStep={5}
            disabled={!showTimeToggle || !value}
            placeholder={timePlaceholder}
            className="date-value-panel-time"
            getPopupContainer={(triggerNode) => triggerNode.parentElement ?? document.body}
            onChange={handleTimeChange}
          />
        </div>
      </div>
      <div onMouseDown={(event) => event.stopPropagation()}>
        <Checkbox
          checked={showTimeToggle}
          className="date-value-panel-toggle"
          onChange={(event) => handleToggleChange(event.target.checked)}
        >
          具体时间
        </Checkbox>
      </div>
      <Divider className="date-value-panel-divider" />
      <div className="date-value-panel-footer">
        <Button
          type="text"
          icon={<ReloadOutlined />}
          className="date-value-panel-clear"
          onClick={onClear}
        >
          全部清除
        </Button>
      </div>
    </div>
  )
}
