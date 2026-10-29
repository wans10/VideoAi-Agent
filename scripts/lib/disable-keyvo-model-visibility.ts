// Import first: generators and upstream-reader tests must see the unfiltered upstream catalog and the database path.
process.env.KEYVO_MODEL_VISIBILITY = 'off';
process.env.KEYVO_BUNDLED_EXAMPLES = 'off';
