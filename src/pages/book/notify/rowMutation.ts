// What NotifyMe hands to a row: the mutation callbacks every channel shares
// (clear the old failure, say a new one, ask for the booking again).
export type RowMutation = {
  onMutate: () => void
  onError: (error: unknown) => void
  onSettled: () => void
}
