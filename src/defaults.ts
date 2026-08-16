/** Built-in ignored directory basenames for the @file picker index. */
export const DEFAULT_IGNORE_DIRS: readonly string[] = [
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  '.venv',
  'venv',
  '.env',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  '.cache',
  '.turbo',
  '.idea',
  '.vscode',
  '.vs',
  'coverage',
  '.DS_Store',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  'target',
  '.gradle',
  '.tox',
]

/** Built-in excluded file extensions for the @file picker (media/binaries). */
export const DEFAULT_IGNORE_EXTENSIONS: readonly string[] = [
  // images
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'avif', 'heic', 'heif', 'tiff', 'tif', 'svg',
  // video
  'mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v', 'flv', 'wmv', 'mpg', 'mpeg', '3gp', 'ogv',
  // audio
  'mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac', 'opus', 'wma', 'mid', 'midi',
  // archives / binaries / assets
  'pdf', 'zip', 'gz', 'tar', '7z', 'rar', 'bz2', 'xz', 'exe', 'dll', 'so', 'dylib', 'bin', 'dat',
  'obj', 'o', 'a', 'class', 'jar', 'woff', 'woff2', 'ttf', 'otf', 'eot', 'wasm', 'pyc', 'pyd',
  'node', 'swf', 'iso', 'dmg', 'deb', 'rpm',
]
