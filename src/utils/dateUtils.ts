// Date utilities to ensure consistent formatting between server and client

export const formatDateConsistently = (date: Date): string => {
  // Use a consistent format that works the same on server and client
  const year = date.getFullYear()
  const month = date.toLocaleString('en-US', { month: 'long' })
  const day = date.getDate()
  const weekday = date.toLocaleString('en-US', { weekday: 'long' })

  return `${weekday}, ${month} ${day}, ${year}`
}

export const formatEventDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  const today = new Date()

  // Reset time to avoid timezone issues
  const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const normalizedTomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

  if (normalizedDate.getTime() === normalizedToday.getTime()) {
    return 'Today'
  }

  if (normalizedDate.getTime() === normalizedTomorrow.getTime()) {
    return 'Tomorrow'
  }

  // Use consistent date formatting
  const weekday = date.toLocaleString('en-US', { weekday: 'short' })
  const month = date.toLocaleString('en-US', { month: 'short' })
  const day = date.getDate()

  return `${weekday}, ${month} ${day}`
}

export const getCurrentDateString = (): string => {
  const today = new Date()
  return formatDateConsistently(today)
}