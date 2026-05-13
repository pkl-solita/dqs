function pad(input: number): string {
  return input.toString().padStart(2, '0')
}

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  return `${year}-${month}-${day}`
}
