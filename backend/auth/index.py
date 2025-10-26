'''
Business: API для авторизации и управления редакторами
Args: event - dict с httpMethod, body, queryStringParameters, headers
      context - объект с атрибутами request_id, function_name
Returns: HTTP response с данными авторизации или результатом операции
'''
import json
import os
from typing import Dict, Any, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
import hashlib

def get_db_connection():
    database_url = os.environ.get('DATABASE_URL')
    return psycopg2.connect(database_url, cursor_factory=RealDictCursor)

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def authenticate_editor(username: str, password: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cur = conn.cursor()
    
    password_hash = hash_password(password)
    cur.execute("""
        SELECT id, username, full_name, is_super_admin, is_active 
        FROM editors 
        WHERE username = %s AND password_hash = %s AND is_active = TRUE
    """, (username, password_hash))
    
    editor = cur.fetchone()
    
    cur.close()
    conn.close()
    
    return dict(editor) if editor else None

def create_editor(data: Dict[str, Any], requester_username: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT is_super_admin FROM editors WHERE username = %s", (requester_username,))
    requester = cur.fetchone()
    
    if not requester or not requester['is_super_admin']:
        cur.close()
        conn.close()
        return None
    
    password_hash = hash_password(data.get('password', 'changeme123'))
    
    cur.execute("""
        INSERT INTO editors (username, password_hash, full_name, is_super_admin, is_active)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id, username, full_name, is_super_admin, is_active
    """, (
        data.get('username'),
        password_hash,
        data.get('full_name', ''),
        False,
        True
    ))
    
    editor = cur.fetchone()
    conn.commit()
    
    cur.close()
    conn.close()
    
    return dict(editor) if editor else None

def update_editor_password(username: str, old_password: str, new_password: str) -> bool:
    conn = get_db_connection()
    cur = conn.cursor()
    
    old_hash = hash_password(old_password)
    cur.execute("SELECT id FROM editors WHERE username = %s AND password_hash = %s", (username, old_hash))
    
    if not cur.fetchone():
        cur.close()
        conn.close()
        return False
    
    new_hash = hash_password(new_password)
    cur.execute("""
        UPDATE editors 
        SET password_hash = %s, updated_at = CURRENT_TIMESTAMP 
        WHERE username = %s
    """, (new_hash, username))
    
    updated = cur.rowcount > 0
    conn.commit()
    
    cur.close()
    conn.close()
    
    return updated

def list_editors(requester_username: str) -> Optional[list]:
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT is_super_admin FROM editors WHERE username = %s", (requester_username,))
    requester = cur.fetchone()
    
    if not requester or not requester['is_super_admin']:
        cur.close()
        conn.close()
        return None
    
    cur.execute("""
        SELECT id, username, full_name, is_super_admin, is_active, created_at 
        FROM editors 
        ORDER BY created_at DESC
    """)
    
    editors = cur.fetchall()
    
    cur.close()
    conn.close()
    
    return [dict(editor) for editor in editors]

def delete_editor(editor_id: int, requester_username: str) -> bool:
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT is_super_admin FROM editors WHERE username = %s", (requester_username,))
    requester = cur.fetchone()
    
    if not requester or not requester['is_super_admin']:
        cur.close()
        conn.close()
        return False
    
    cur.execute("DELETE FROM editors WHERE id = %s AND is_super_admin = FALSE", (editor_id,))
    deleted = cur.rowcount > 0
    conn.commit()
    
    cur.close()
    conn.close()
    
    return deleted

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Editor-Username, X-Editor-Password',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    headers = event.get('headers', {})
    body_data = json.loads(event.get('body', '{}'))
    
    if method == 'POST' and body_data.get('action') == 'login':
        username = body_data.get('username')
        password = body_data.get('password')
        
        if not username or not password:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'Логин и пароль обязательны'})
            }
        
        editor = authenticate_editor(username, password)
        
        if editor:
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({
                    'success': True,
                    'editor': editor
                })
            }
        else:
            return {
                'statusCode': 401,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'Неверный логин или пароль'})
            }
    
    editor_username = headers.get('X-Editor-Username') or headers.get('x-editor-username')
    editor_password = headers.get('X-Editor-Password') or headers.get('x-editor-password')
    
    if not editor_username or not editor_password:
        return {
            'statusCode': 401,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'error': 'Требуется авторизация'})
        }
    
    if not authenticate_editor(editor_username, editor_password):
        return {
            'statusCode': 401,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'error': 'Неверные учётные данные'})
        }
    
    if method == 'GET':
        editors = list_editors(editor_username)
        if editors is not None:
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'editors': editors})
            }
        else:
            return {
                'statusCode': 403,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'Доступ запрещён'})
            }
    
    if method == 'POST' and body_data.get('action') == 'create_editor':
        editor = create_editor(body_data, editor_username)
        if editor:
            return {
                'statusCode': 201,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'editor': editor})
            }
        else:
            return {
                'statusCode': 403,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'Недостаточно прав'})
            }
    
    if method == 'PUT' and body_data.get('action') == 'change_password':
        old_password = body_data.get('old_password')
        new_password = body_data.get('new_password')
        
        if not old_password or not new_password:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'Старый и новый пароль обязательны'})
            }
        
        success = update_editor_password(editor_username, old_password, new_password)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'success': success})
        }
    
    if method == 'DELETE':
        editor_id = body_data.get('id')
        if not editor_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'ID редактора обязателен'})
            }
        
        success = delete_editor(editor_id, editor_username)
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'success': success})
        }
    
    return {
        'statusCode': 405,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'isBase64Encoded': False,
        'body': json.dumps({'error': 'Метод не поддерживается'})
    }
