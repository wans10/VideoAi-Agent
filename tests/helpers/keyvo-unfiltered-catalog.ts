// Keyvo projects non-mainland model families as unpublished on its web surfaces. Upstream contracts that
// exercise those models run on the unfiltered catalog. The runtime projection reads this variable once at
// module load, so import this helper before any config or server module.
process.env.KEYVO_MODEL_VISIBILITY = 'off';
