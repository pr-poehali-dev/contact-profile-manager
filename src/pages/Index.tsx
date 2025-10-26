import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface Contact {
  id: number;
  name: string;
  telegram_username: string;
  position: string;
  avatar_url: string | null;
  display_order: number;
}

interface Editor {
  id: number;
  username: string;
  full_name: string;
  is_super_admin: boolean;
  is_active: boolean;
}

const API_CONTACTS = 'https://functions.poehali.dev/b8613daf-13ab-4b83-a7a5-6f4176fc41d6';
const API_AUTH = 'https://functions.poehali.dev/1a0f04dd-68b0-4df6-be72-bf214973d51b';

export default function Index() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showEditorsDialog, setShowEditorsDialog] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [editingContact, setEditingContact] = useState<Partial<Contact> | null>(null);
  const [editors, setEditors] = useState<Editor[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const response = await fetch(API_CONTACTS);
      const data = await response.json();
      setContacts(data.contacts || []);
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить контакты',
        variant: 'destructive',
      });
    }
  };

  const handleLogin = async () => {
    if (!loginUsername || !loginPassword) return;

    try {
      const response = await fetch(API_AUTH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          username: loginUsername,
          password: loginPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setEditor(data.editor);
        setShowLoginDialog(false);
        toast({
          title: 'Доступ разрешён',
          description: `Добро пожаловать, ${data.editor.full_name || data.editor.username}`,
        });
        setLoginPassword('');
      } else {
        toast({
          title: 'Доступ запрещён',
          description: data.error || 'Неверный логин или пароль',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось выполнить вход',
        variant: 'destructive',
      });
    }
  };

  const handleSaveContact = async () => {
    if (!editingContact || !editor || !loginPassword) return;

    try {
      const method = editingContact.id ? 'PUT' : 'POST';
      const response = await fetch(API_CONTACTS, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Editor-Username': editor.username,
          'X-Editor-Password': loginPassword,
        },
        body: JSON.stringify(editingContact),
      });

      if (response.status === 401) {
        toast({
          title: 'Сессия истекла',
          description: 'Войдите заново',
          variant: 'destructive',
        });
        setEditor(null);
        return;
      }

      if (response.ok) {
        toast({
          title: 'Успешно',
          description: editingContact.id ? 'Контакт обновлён' : 'Контакт добавлен',
        });
        loadContacts();
        setShowEditDialog(false);
        setEditingContact(null);
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить контакт',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteContact = async (id: number) => {
    if (!editor || !loginPassword) return;

    try {
      const response = await fetch(API_CONTACTS, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Editor-Username': editor.username,
          'X-Editor-Password': loginPassword,
        },
        body: JSON.stringify({ id }),
      });

      if (response.status === 401) {
        toast({
          title: 'Сессия истекла',
          description: 'Войдите заново',
          variant: 'destructive',
        });
        setEditor(null);
        return;
      }

      if (response.ok) {
        toast({
          title: 'Успешно',
          description: 'Контакт удалён',
        });
        loadContacts();
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить контакт',
        variant: 'destructive',
      });
    }
  };

  const handleChangePassword = async () => {
    if (!editor || !oldPassword || !newPassword) return;

    try {
      const response = await fetch(API_AUTH, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Editor-Username': editor.username,
          'X-Editor-Password': oldPassword,
        },
        body: JSON.stringify({
          action: 'change_password',
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'Успешно',
          description: 'Пароль изменён',
        });
        setLoginPassword(newPassword);
        setOldPassword('');
        setNewPassword('');
        setShowPasswordDialog(false);
      } else {
        toast({
          title: 'Ошибка',
          description: 'Неверный старый пароль',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось изменить пароль',
        variant: 'destructive',
      });
    }
  };

  const loadEditors = async () => {
    if (!editor || !loginPassword) return;

    try {
      const response = await fetch(API_AUTH, {
        method: 'GET',
        headers: {
          'X-Editor-Username': editor.username,
          'X-Editor-Password': loginPassword,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setEditors(data.editors || []);
        setShowEditorsDialog(true);
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить список редакторов',
        variant: 'destructive',
      });
    }
  };

  const openTelegram = (username: string) => {
    window.open(`https://t.me/${username}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(34,197,94,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(34,197,94,0.05),transparent_50%)]" />
      
      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs uppercase tracking-widest text-primary font-mono">
                Секретный доступ
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-foreground font-mono tracking-tighter">
              КОНТАКТЫ
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-mono">
              Защищённая система связи
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-12">
            {contacts.map((contact, index) => (
              <Card
                key={contact.id}
                className="p-6 bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 hover:bg-card/80 transition-all duration-300 hover:scale-105 animate-scale-in relative group overflow-hidden"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex flex-col items-center text-center space-y-4 relative z-10">
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary text-2xl font-bold font-mono border border-primary/20">
                    {contact.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1 font-mono">{contact.name}</h3>
                    {contact.position && (
                      <p className="text-xs text-muted-foreground mb-3 font-mono uppercase tracking-wider">
                        {contact.position}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={() => openTelegram(contact.telegram_username)}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-mono text-sm"
                  >
                    <Icon name="Send" className="mr-2 h-4 w-4" />
                    Telegram
                  </Button>

                  {editor && (
                    <div className="flex gap-2 w-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingContact(contact);
                          setShowEditDialog(true);
                        }}
                        className="flex-1 border-primary/20 hover:bg-primary/10"
                      >
                        <Icon name="Edit" className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteContact(contact.id)}
                        className="flex-1"
                      >
                        <Icon name="Trash2" className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>

          <div className="flex justify-center gap-4 flex-wrap">
            {!editor ? (
              <Button
                onClick={() => setShowLoginDialog(true)}
                className="group bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-mono"
              >
                <Icon name="Lock" className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                Доступ для редакторов
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => {
                    setEditingContact({ display_order: contacts.length });
                    setShowEditDialog(true);
                  }}
                  className="bg-primary hover:bg-primary/90 font-mono"
                >
                  <Icon name="Plus" className="mr-2 h-4 w-4" />
                  Добавить контакт
                </Button>
                <Button
                  onClick={() => setShowPasswordDialog(true)}
                  variant="outline"
                  className="border-primary/20 hover:bg-primary/10 font-mono"
                >
                  <Icon name="Key" className="mr-2 h-4 w-4" />
                  Сменить пароль
                </Button>
                {editor.is_super_admin && (
                  <Button
                    onClick={loadEditors}
                    variant="outline"
                    className="border-primary/20 hover:bg-primary/10 font-mono"
                  >
                    <Icon name="Users" className="mr-2 h-4 w-4" />
                    Редакторы
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditor(null);
                    setLoginPassword('');
                    toast({
                      title: 'Выход выполнен',
                      description: 'Доступ закрыт',
                    });
                  }}
                  className="border-destructive/20 hover:bg-destructive/10 font-mono"
                >
                  <Icon name="LogOut" className="mr-2 h-4 w-4" />
                  Выйти
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-mono">Авторизация редактора</DialogTitle>
            <DialogDescription className="font-mono text-sm">
              Введите учётные данные для доступа к редактированию
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="font-mono text-xs uppercase tracking-wider">
                Логин
              </Label>
              <Input
                id="username"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="username"
                className="font-mono bg-background/50"
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-mono text-xs uppercase tracking-wider">
                Пароль
              </Label>
              <Input
                id="password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••"
                className="font-mono bg-background/50"
                autoComplete="current-password"
              />
            </div>
            <Button onClick={handleLogin} className="w-full bg-primary hover:bg-primary/90 font-mono">
              <Icon name="Unlock" className="mr-2 h-4 w-4" />
              Получить доступ
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-mono">
              {editingContact?.id ? 'Редактировать контакт' : 'Добавить контакт'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-mono text-xs uppercase tracking-wider">
                Имя
              </Label>
              <Input
                id="name"
                value={editingContact?.name || ''}
                onChange={(e) =>
                  setEditingContact({ ...editingContact, name: e.target.value })
                }
                placeholder="Иван Иванов"
                className="font-mono bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telegram" className="font-mono text-xs uppercase tracking-wider">
                Telegram (без @)
              </Label>
              <Input
                id="telegram"
                value={editingContact?.telegram_username || ''}
                onChange={(e) =>
                  setEditingContact({ ...editingContact, telegram_username: e.target.value })
                }
                placeholder="username"
                className="font-mono bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position" className="font-mono text-xs uppercase tracking-wider">
                Должность
              </Label>
              <Input
                id="position"
                value={editingContact?.position || ''}
                onChange={(e) =>
                  setEditingContact({ ...editingContact, position: e.target.value })
                }
                placeholder="Менеджер"
                className="font-mono bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="order" className="font-mono text-xs uppercase tracking-wider">
                Порядок
              </Label>
              <Input
                id="order"
                type="number"
                value={editingContact?.display_order || 0}
                onChange={(e) =>
                  setEditingContact({
                    ...editingContact,
                    display_order: parseInt(e.target.value) || 0,
                  })
                }
                className="font-mono bg-background/50"
              />
            </div>
            <Button onClick={handleSaveContact} className="w-full bg-primary hover:bg-primary/90 font-mono">
              Сохранить
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-mono">Смена пароля</DialogTitle>
            <DialogDescription className="font-mono text-sm">
              Введите текущий и новый пароль
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="old_password" className="font-mono text-xs uppercase tracking-wider">
                Текущий пароль
              </Label>
              <Input
                id="old_password"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="••••••••"
                className="font-mono bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_password" className="font-mono text-xs uppercase tracking-wider">
                Новый пароль
              </Label>
              <Input
                id="new_password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="font-mono bg-background/50"
              />
            </div>
            <Button onClick={handleChangePassword} className="w-full bg-primary hover:bg-primary/90 font-mono">
              Изменить пароль
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditorsDialog} onOpenChange={setShowEditorsDialog}>
        <DialogContent className="sm:max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-mono">Список редакторов</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {editors.map((ed) => (
              <div
                key={ed.id}
                className="flex items-center justify-between p-3 bg-background/50 rounded border border-border/50 font-mono text-sm"
              >
                <div>
                  <div className="font-semibold">{ed.username}</div>
                  <div className="text-xs text-muted-foreground">{ed.full_name}</div>
                </div>
                <div className="flex items-center gap-2">
                  {ed.is_super_admin && (
                    <span className="px-2 py-1 bg-primary/20 text-primary text-xs rounded">
                      ADMIN
                    </span>
                  )}
                  {!ed.is_active && (
                    <span className="px-2 py-1 bg-destructive/20 text-destructive text-xs rounded">
                      DISABLED
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
