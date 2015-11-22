# 1.3.2
* Fixed: bug with running tasks with non-zero offset

# 1.3.1
* Fixed: of-by-one timeout bug

# 1.3.0
* Added: `Task#getNext()` returns the next time a task should run

# 1.2.0
* Added: accepts strings like '3s' and '10min' to represent time. Valid units are: ms, s, min, h, d
* Added: `options.offset` to set the offset from whole intervals. With this, one may schedule a task to run every hour when the minutes are 00:17 with `options = {interval: '1h', offset: '17min'}`

# 1.1.0
* Changed: only one global lock is used. Previously, two locks were used (interval and global) and one was left as garbage in the collection.
* Added: `Task#start()` returns the next execution date.

# 1.0.2
* Fixed: bug with timeout always firing