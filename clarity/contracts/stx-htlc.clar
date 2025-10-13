;; SunnySwap STX Hashed Timelock Contract (HTLC)
;; Cross-chain atomic swaps between Stacks and EVM chains

;; Error constants
(define-constant ERR_INVALID_HASH_LENGTH (err u1000))
(define-constant ERR_EXPIRY_IN_PAST (err u1001))
(define-constant ERR_SWAP_INTENT_ALREADY_EXISTS (err u1002))
(define-constant ERR_UNKNOWN_SWAP_INTENT (err u1003))
(define-constant ERR_SWAP_INTENT_EXPIRED (err u1004))
(define-constant ERR_SWAP_INTENT_NOT_EXPIRED (err u1005))
(define-constant ERR_INVALID_PREIMAGE (err u1006))
(define-constant ERR_UNAUTHORISED (err u1007))

;; Main storage map for swap intents
(define-map swap-intents
  {sender: principal, hash: (buff 32)}
  {
    expiration-height: uint,
    amount: uint,
    recipient: principal,
  }
)

;; Read-only functions

;; Get a swap intent by hash and sender
(define-read-only (get-swap-intent (hash (buff 32)) (sender principal))
  (map-get? swap-intents {sender: sender, hash: hash})
)

;; Check if a swap intent exists
(define-read-only (has-swap-intent (hash (buff 32)) (sender principal))
  (is-some (map-get? swap-intents {sender: sender, hash: hash}))
)

;; Check if a swap intent is expired
(define-read-only (is-swap-intent-expired (hash (buff 32)) (sender principal))
  (match (get-swap-intent hash sender)
    swap-intent (>= stacks-block-height (get expiration-height swap-intent))
    false
  )
)

;; Public functions

;; Register a new swap intent - locks STX tokens
(define-public (register-swap-intent
    (hash (buff 32))
    (expiration-height uint)
    (amount uint)
    (recipient principal)
  )
  (begin
    ;; Validate hash length is exactly 32 bytes (SHA256)
    (asserts! (is-eq (len hash) u32) ERR_INVALID_HASH_LENGTH)
    ;; Ensure expiration is in the future
    (asserts! (< stacks-block-height expiration-height) ERR_EXPIRY_IN_PAST)
    ;; Ensure this swap intent doesn't already exist
    (asserts!
      (map-insert swap-intents
        {sender: tx-sender, hash: hash}
        {
          expiration-height: expiration-height,
          amount: amount,
          recipient: recipient,
        }
      )
      ERR_SWAP_INTENT_ALREADY_EXISTS
    )
    ;; Transfer STX from sender to this contract for escrow
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    
    ;; Emit event for indexers/frontends
    (print {
      topic: "swap-intent-registered",
      sender: tx-sender,
      hash: hash,
      amount: amount,
      recipient: recipient,
      expiration-height: expiration-height,
    })
    (ok true)
  )
)

;; Cancel a swap intent and recover funds (only after expiration)
(define-public (cancel-swap-intent (hash (buff 32)))
  (let (
      (swap-intent (unwrap! (get-swap-intent hash tx-sender) ERR_UNKNOWN_SWAP_INTENT))
      (sender tx-sender)
    )
    ;; Ensure the swap intent has expired
    (asserts! (>= stacks-block-height (get expiration-height swap-intent)) ERR_SWAP_INTENT_NOT_EXPIRED)
    ;; Transfer STX back to the original sender
    (try! (as-contract (stx-transfer? (get amount swap-intent) tx-sender sender)))
    ;; Delete the swap intent from storage
    (map-delete swap-intents {sender: tx-sender, hash: hash})
    ;; Emit event
    (print {
      topic: "swap-intent-cancelled",
      sender: sender,
      hash: hash,
      amount: (get amount swap-intent),
    })
    (ok true)
  )
)

;; Claim STX by revealing the preimage (completes the atomic swap)
(define-public (swap (sender principal) (preimage (buff 64)))
  (let (
      (hash (sha256 preimage))
      (swap-intent (unwrap! (get-swap-intent hash sender) ERR_UNKNOWN_SWAP_INTENT))
      (recipient (get recipient swap-intent))
    )
    ;; Ensure the swap intent has not expired
    (asserts! (< stacks-block-height (get expiration-height swap-intent)) ERR_SWAP_INTENT_EXPIRED)
    ;; Verify the caller is the designated recipient
    (asserts! (is-eq tx-sender recipient) ERR_UNAUTHORISED)
    ;; Transfer STX to the recipient
    (try! (as-contract (stx-transfer? (get amount swap-intent) tx-sender recipient)))
    ;; Delete the swap intent from storage
    (map-delete swap-intents {sender: sender, hash: hash})
    ;; Emit event with the revealed preimage for cross-chain coordination
    (print {
      topic: "swap-completed",
      sender: sender,
      recipient: recipient,
      hash: hash,
      preimage: preimage,
      amount: (get amount swap-intent),
    })
    (ok true)
  )
)
