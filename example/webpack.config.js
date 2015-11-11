module.exports = {
  entry: "./index.js",
  output:{
    path: __dirname,
    filename: "bundle.js"
  },
  module: {
    loaders: [
      { test: /\.jsx?$/, loader: 'babel', query: {presets: ['react', 'es2015']}, exclude: /node_modules/ },
      { test: /\.css$/, loader: "style!css" },
    ]
  }
}
