import sqlite3
import json
import os
import random
import time
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Configuração do Banco de Dados SQLite
DB_FILE = 'reparai.db'

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS pedidos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            proto TEXT UNIQUE,
            nome TEXT,
            zap TEXT,
            email TEXT,
            equip TEXT,
            endereco TEXT,
            obs TEXT,
            status INTEGER DEFAULT 0,
            criado INTEGER
        )
    ''')
    
    # Adicionar tabela de usuarios
    c.execute('''
        CREATE TABLE IF NOT EXISTS usuarios (
            email TEXT PRIMARY KEY,
            nome TEXT,
            senha TEXT
        )
    ''')
    conn.commit()
    conn.close()

init_db()

class ReparaiHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200, "ok")
        self.end_headers()

    def do_GET(self):
        parsed_path = urlparse(self.path)
        
        # Rota para listar todos os pedidos (Admin)
        if parsed_path.path == '/api/pedidos':
            conn = sqlite3.connect(DB_FILE)
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            c.execute('SELECT * FROM pedidos ORDER BY criado DESC')
            rows = [dict(row) for row in c.fetchall()]
            conn.close()
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(rows).encode())
            return
            
        # Rota para buscar pedidos de um usuario especifico
        elif parsed_path.path == '/api/pedidos/meus':
            qs = parse_qs(parsed_path.query)
            email = qs.get('email', [''])[0]
            
            conn = sqlite3.connect(DB_FILE)
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            c.execute('SELECT * FROM pedidos WHERE email = ? ORDER BY criado DESC', (email,))
            rows = [dict(row) for row in c.fetchall()]
            conn.close()
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(rows).encode())
            return
            
        # Rota para buscar um pedido por protocolo
        elif parsed_path.path.startswith('/api/pedidos/'):
            proto = parsed_path.path.split('/')[-1].upper()
            conn = sqlite3.connect(DB_FILE)
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            c.execute('SELECT * FROM pedidos WHERE proto = ?', (proto,))
            row = c.fetchone()
            conn.close()
            
            if row:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(dict(row)).encode())
            else:
                self.send_response(404)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Pedido não encontrado."}).encode())
            return
            
        # Servir os arquivos estáticos normais (index.html, css, js)
        if self.path == '/':
            self.path = '/index.html'
        return super().do_GET()

    def do_POST(self):
        parsed_path = urlparse(self.path)
        
        # Rota para Registro
        if parsed_path.path == '/api/register':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())
            
            conn = sqlite3.connect(DB_FILE)
            c = conn.cursor()
            try:
                c.execute('INSERT INTO usuarios (email, nome, senha) VALUES (?, ?, ?)', 
                          (data.get('email'), data.get('nome'), data.get('senha')))
                conn.commit()
                self.send_response(201)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"mensagem": "Usuário criado"}).encode())
            except sqlite3.IntegrityError:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Email já cadastrado"}).encode())
            finally:
                conn.close()
            return
            
        # Rota para Login
        elif parsed_path.path == '/api/login':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())
            
            conn = sqlite3.connect(DB_FILE)
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            c.execute('SELECT nome, email FROM usuarios WHERE email = ? AND senha = ?', 
                      (data.get('email'), data.get('senha')))
            user = c.fetchone()
            conn.close()
            
            if user:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(dict(user)).encode())
            else:
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Email ou senha incorretos"}).encode())
            return
            
        # Rota para criar um pedido
        elif parsed_path.path == '/api/pedidos':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())
            
            proto = "RP-" + str(random.randint(1000, 9999))
            criado = int(time.time() * 1000)
            
            conn = sqlite3.connect(DB_FILE)
            c = conn.cursor()
            try:
                # Adicionar a coluna email dinamicamente caso o DB seja antigo e não a tenha
                try:
                    c.execute("ALTER TABLE pedidos ADD COLUMN email TEXT")
                except:
                    pass
                
                c.execute('''
                    INSERT INTO pedidos (proto, nome, zap, email, equip, endereco, obs, status, criado)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
                ''', (proto, data.get('nome'), data.get('zap'), data.get('email'), data.get('equip'), data.get('endereco'), data.get('obs'), criado))
                conn.commit()
                success = True
            except sqlite3.Error as e:
                print(e)
                success = False
            finally:
                conn.close()
                
            if success:
                self.send_response(201)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"mensagem": "Pedido criado!", "proto": proto}).encode())
            else:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Erro ao salvar"}).encode())
            return
            
        # Rota para upload de imagem (Base64)
        elif parsed_path.path == '/api/upload':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())
            proto = data.get('proto', 'UNKNOWN')
            b64_data = data.get('imagem', '')
            
            if b64_data.startswith('data:image'):
                b64_data = b64_data.split(',')[1]
                
            import base64
            try:
                img_bytes = base64.b64decode(b64_data)
                if not os.path.exists('uploads'):
                    os.mkdir('uploads')
                
                filepath = f"uploads/{proto}_{int(time.time())}.jpg"
                with open(filepath, 'wb') as f:
                    f.write(img_bytes)
                    
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"mensagem": "Imagem salva!"}).encode())
            except Exception as e:
                print("Erro ao salvar imagem:", e)
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Erro ao salvar imagem"}).encode())
            return
            
    def do_PUT(self):
        parsed_path = urlparse(self.path)
        
        # Rota para atualizar o status do pedido
        if parsed_path.path.startswith('/api/pedidos/'):
            proto = parsed_path.path.split('/')[-1].upper()
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode())
            status = data.get('status', 0)
            
            conn = sqlite3.connect(DB_FILE)
            c = conn.cursor()
            c.execute('UPDATE pedidos SET status = ? WHERE proto = ?', (status, proto))
            conn.commit()
            changes = c.rowcount
            conn.close()
            
            if changes > 0:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"mensagem": "Status atualizado!"}).encode())
            else:
                self.send_response(404)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Pedido não encontrado"}).encode())
            return


from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
if __name__ == '__main__':
    PORT = 8000
    server = ThreadingHTTPServer(('localhost', PORT), ReparaiHandler)
    print(f"Servidor backend rodando em http://localhost:{PORT}")
    print("Acesse http://localhost:8000/index.html para ver o site.")
    print("Acesse http://localhost:8000/admin.html para ver o painel.")
    server.serve_forever()
