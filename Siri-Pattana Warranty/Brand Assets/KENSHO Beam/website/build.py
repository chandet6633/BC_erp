import os
p = os.path.join(os.path.dirname(__file__), 'index.html')
with open(p, 'w', encoding='utf-8') as f:
    f.write(open(os.path.join(os.path.dirname(__file__), 'build.py'), encoding='utf-8').read().split('# HTML_START')[1].split('# HTML_END')[0].strip())
print('Done:', p)
# This approach won't work, let me just write the HTML directly
