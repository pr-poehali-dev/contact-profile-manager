'''
Business: API для управления контактами визитки с авторизацией
Args: event - dict с httpMethod, body, queryStringParameters, headers
      context - объект с атрибутами request_id, function_name
Returns: HTTP response с контактами или результатом операции
'''
import json
import os
from typing import Dict, Any, List, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
import hashlib

def get_db_connection():
    database_url = os.environ.get('DATABASE_URL')
    return psycopg2.connect(database_url, cursor_factory=RealDictCursor)

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str) -> bool:
    conn = get_db_connection()
    cur = conn.cursor()
    
    password_hash = hash_password(password)
    cur.execute("SELECT password_hash FROM admin_settings WHERE id = 1")
    result = cur.fetchone()
    
    cur.close()
    conn.close()
    
    if result:
        stored_hash = result['password_hash']
        return password_hash == stored_hash
    return False

def get_contacts() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT id, name, telegram_username, position, avatar_url, display_order 
        FROM contacts 
        ORDER BY display_order ASC
    """)
    contacts = cur.fetchall()
    
    cur.close()
    conn.close()
    
    return [dict(contact) for contact in contacts]

def create_contact(data: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("""
        INSERT INTO contacts (name, telegram_username, position, avatar_url, display_order)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id, name, telegram_username, position, avatar_url, display_order
    """, (
        data.get('name'),
        data.get('telegram_username'),
        data.get('position', ''),
        data.get('avatar_url', ''),
        data.get('display_order', 0)
    ))
    
    contact = cur.fetchone()
    conn.commit()
    
    cur.close()
    conn.close()
    
    return dict(contact)

def update_contact(contact_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("""
        UPDATE contacts 
        SET name = %s, telegram_username = %s, position = %s, 
            avatar_url = %s, display_order = %s, updated_at = CURRENT_TIMESTAMP
        WHERE id = %s
        RETURNING id, name, telegram_username, position, avatar_url, display_order
    """, (
        data.get('name'),
        data.get('telegram_username'),
        data.get('position', ''),
        data.get('avatar_url', ''),
        data.get('display_order', 0),
        contact_id
    ))
    
    contact = cur.fetchone()
    conn.commit()
    
    cur.close()
    conn.close()
    
    return dict(contact) if contact else None

def delete_contact(contact_id: int) -> bool:
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("DELETE FROM contacts WHERE id = %s", (contact_id,))
    deleted = cur.rowcount > 0
    conn.commit()
    
    cur.close()
    conn.close()
    
    return deleted

def update_password(new_password: str) -> bool:
    conn = get_db_connection()
    cur = conn.cursor()
    
    password_hash = hash_password(new_password)
    cur.execute("""
        UPDATE admin_settings 
        SET password_hash = %s, updated_at = CURRENT_TIMESTAMP 
        WHERE id = 1
    """, (password_hash,))
    
    updated = cur.rowcount > 0
    conn.commit()
    
    cur.close()
    conn.close()
    
    return updated

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    headers = event.get('headers', {})
    
    if method == 'GET':
        contacts = get_contacts()
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'contacts': contacts})
        }
    
    admin_password = headers.get('X-Admin-Password') or headers.get('x-admin-password')
    
    if not admin_password or not verify_password(admin_password):
        return {
            'statusCode': 401,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'isBase64Encoded': False,
            'body': json.dumps({'error': 'Неверный пароль администратора'})
        }
    
    body_data = json.loads(event.get('body', '{}'))
    
    if method == 'POST':
        if 'new_password' in body_data:
            success = update_password(body_data['new_password'])
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'success': success})
            }
        else:
            contact = create_contact(body_data)
            return {
                'statusCode': 201,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'contact': contact})
            }
    
    if method == 'PUT':
        contact_id = body_data.get('id')
        if not contact_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'ID контакта обязателен'})
            }
        
        contact = update_contact(contact_id, body_data)
        if contact:
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'contact': contact})
            }
        else:
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'Контакт не найден'})
            }
    
    if method == 'DELETE':
        contact_id = body_data.get('id')
        if not contact_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'isBase64Encoded': False,
                'body': json.dumps({'error': 'ID контакта обязателен'})
            }
        
        success = delete_contact(contact_id)
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
