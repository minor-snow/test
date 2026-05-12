import sqlite3
conn = sqlite3.connect(r'H:\Analysis\zhihu\bot_database.db')
conn.execute("UPDATE accounts SET is_in_use=0")
conn.execute("UPDATE question_tasks SET state='READY', lease_owner=NULL WHERE state='LEASED'")
conn.commit()
print('Reset OK')
