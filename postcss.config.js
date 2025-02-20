export default {
  plugins: {
    'postcss-preset-env': {
      stage: 0,
      features: {
        'nesting-rules': true,
      }
    },
    tailwindcss: {},
    autoprefixer: {
      grid: true,
      flexbox: true
    }
  }
}
