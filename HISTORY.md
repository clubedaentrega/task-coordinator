# 1.1.0
* Changed: only one global lock is used. Previously, two locks were used (interval and global) and one was left as garbage in the collection.
* Added: `Task#start()` returns the next execution date.

# 1.0.2
* Fixed: bug with timeout always firing