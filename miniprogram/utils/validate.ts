export const isNonEmpty = (value: string): boolean => value.trim().length > 0

export const isValidPageParam = (value: number): boolean => Number.isInteger(value) && value > 0
