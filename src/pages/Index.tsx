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
  const [showCreateEditorDialog, setShowCreateEditorDialog] = useState(false);
  const [newEditorUsername, setNewEditorUsername] = useState('');
  const [newEditorFullName, setNewEditorFullName] = useState('');
  const [newEditorPassword, setNewEditorPassword] = useState('');
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

  const handleCreateEditor = async () => {
    if (!editor || !loginPassword || !newEditorUsername || !newEditorPassword) return;

    try {
      const response = await fetch(API_AUTH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Editor-Username': editor.username,
          'X-Editor-Password': loginPassword,
        },
        body: JSON.stringify({
          action: 'create_editor',
          username: newEditorUsername,
          password: newEditorPassword,
          full_name: newEditorFullName,
        }),
      });

      const data = await response.json();

      if (response.ok && data.editor) {
        toast({
          title: 'Успешно',
          description: `Редактор ${newEditorUsername} создан`,
        });
        setShowCreateEditorDialog(false);
        setNewEditorUsername('');
        setNewEditorFullName('');
        setNewEditorPassword('');
        loadEditors();
      } else {
        toast({
          title: 'Ошибка',
          description: data.error || 'Не удалось создать редактора',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать редактора',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteEditor = async (editorId: number) => {
    if (!editor || !loginPassword) return;

    try {
      const response = await fetch(API_AUTH, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Editor-Username': editor.username,
          'X-Editor-Password': loginPassword,
        },
        body: JSON.stringify({ id: editorId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: 'Успешно',
          description: 'Редактор удалён',
        });
        loadEditors();
      } else {
        toast({
          title: 'Ошибка',
          description: data.error || 'Не удалось удалить редактора',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить редактора',
        variant: 'destructive',
      });
    }
  };

  const openTelegram = (username: string) => {
    window.open(`https://t.me/${username}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(217,70,239,0.15),transparent_50%)]" />
      <div className="absolute inset-0 opacity-30 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L2c+PC9zdmc+')]" />
      
      <div className="container mx-auto px-4 py-16 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass mb-8">
              <div className="w-2 h-2 rounded-full bg-gradient-primary animate-pulse shadow-lg shadow-primary/50" />
              <span className="text-xs uppercase tracking-widest font-semibold gradient-text">
                Защищённый доступ
              </span>
            </div>
            <h1 className="text-6xl md:text-8xl font-bold mb-6 gradient-text tracking-tight">
              Контакты
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-light">
              Безопасная система связи с шифрованным доступом
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
            {contacts.map((contact, index) => (
              <Card
                key={contact.id}
                className="p-6 glass-card hover:bg-card/60 transition-all duration-500 hover:scale-105 hover:-translate-y-2 animate-scale-in relative group overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-primary/20"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-500" />
                
                <div className="flex flex-col items-center text-center space-y-4 relative z-10">
                  <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-primary/30 group-hover:shadow-primary/50 transition-shadow duration-300">
                    {contact.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-xl mb-2">{contact.name}</h3>
                    {contact.position && (
                      <p className="text-sm text-muted-foreground mb-3 uppercase tracking-wide font-medium">
                        {contact.position}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={() => openTelegram(contact.telegram_username)}
                    className="w-full gradient-primary hover:opacity-90 text-white font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300"
                  >
                    <Icon name="Send" className="mr-2 h-4 w-4" />
                    Написать
                  </Button>

                  {editor && (
                    <div className="flex gap-2 w-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingContact(contact);
                          setShowEditDialog(true);
                        }}
                        className="flex-1 glass hover:bg-primary/10 border-primary/30"
                      >
                        <Icon name="Edit" className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteContact(contact.id)}
                        className="flex-1 hover:bg-destructive/90"
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
                className="group glass hover:bg-primary/10 border-primary/30 shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all duration-300"
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
                  className="gradient-primary hover:opacity-90 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300"
                >
                  <Icon name="Plus" className="mr-2 h-4 w-4" />
                  Добавить контакт
                </Button>
                <Button
                  onClick={() => setShowPasswordDialog(true)}
                  className="glass hover:bg-primary/10 border-primary/30"
                >
                  <Icon name="Key" className="mr-2 h-4 w-4" />
                  Сменить пароль
                </Button>
                {editor.is_super_admin && (
                  <Button
                    onClick={loadEditors}
                    className="glass hover:bg-accent/10 border-accent/30"
                  >
                    <Icon name="Users" className="mr-2 h-4 w-4" />
                    Редакторы
                  </Button>
                )}
                <Button
                  onClick={() => {
                    setEditor(null);
                    setLoginPassword('');
                    toast({
                      title: 'Выход выполнен',
                      description: 'Доступ закрыт',
                    });
                  }}
                  className="glass hover:bg-destructive/10 border-destructive/30"
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
        <DialogContent className="sm:max-w-md glass-card">
          <DialogHeader>
            <DialogTitle className="text-2xl gradient-text">Авторизация</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Введите учётные данные для доступа к редактированию
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-xs uppercase tracking-wider font-semibold">
                Логин
              </Label>
              <Input
                id="username"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="username"
                className="glass"
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-wider font-semibold">
                Пароль
              </Label>
              <Input
                id="password"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••"
                className="glass"
                autoComplete="current-password"
              />
            </div>
            <Button onClick={handleLogin} className="w-full gradient-primary hover:opacity-90 shadow-lg shadow-primary/30">
              <Icon name="Unlock" className="mr-2 h-4 w-4" />
              Получить доступ
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md glass-card">
          <DialogHeader>
            <DialogTitle className="text-2xl gradient-text">
              {editingContact?.id ? 'Редактировать контакт' : 'Добавить контакт'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs uppercase tracking-wider font-semibold">
                Имя
              </Label>
              <Input
                id="name"
                value={editingContact?.name || ''}
                onChange={(e) =>
                  setEditingContact({ ...editingContact, name: e.target.value })
                }
                placeholder="Иван Иванов"
                className="glass"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telegram" className="text-xs uppercase tracking-wider font-semibold">
                Telegram (без @)
              </Label>
              <Input
                id="telegram"
                value={editingContact?.telegram_username || ''}
                onChange={(e) =>
                  setEditingContact({ ...editingContact, telegram_username: e.target.value })
                }
                placeholder="username"
                className="glass"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position" className="text-xs uppercase tracking-wider font-semibold">
                Должность
              </Label>
              <Input
                id="position"
                value={editingContact?.position || ''}
                onChange={(e) =>
                  setEditingContact({ ...editingContact, position: e.target.value })
                }
                placeholder="Менеджер"
                className="glass"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="order" className="text-xs uppercase tracking-wider font-semibold">
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
                className="glass"
              />
            </div>
            <Button onClick={handleSaveContact} className="w-full gradient-primary hover:opacity-90 shadow-lg shadow-primary/30">
              Сохранить
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md glass-card">
          <DialogHeader>
            <DialogTitle className="text-2xl gradient-text">Смена пароля</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Введите текущий и новый пароль
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="old_password" className="text-xs uppercase tracking-wider font-semibold">
                Текущий пароль
              </Label>
              <Input
                id="old_password"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="••••••••"
                className="glass"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_password" className="text-xs uppercase tracking-wider font-semibold">
                Новый пароль
              </Label>
              <Input
                id="new_password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="glass"
              />
            </div>
            <Button onClick={handleChangePassword} className="w-full gradient-primary hover:opacity-90 shadow-lg shadow-primary/30">
              Изменить пароль
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditorsDialog} onOpenChange={setShowEditorsDialog}>
        <DialogContent className="sm:max-w-2xl glass-card">
          <DialogHeader>
            <DialogTitle className="text-2xl gradient-text">Список редакторов</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Button
              onClick={() => {
                setShowEditorsDialog(false);
                setShowCreateEditorDialog(true);
              }}
              className="w-full gradient-primary hover:opacity-90 shadow-lg shadow-primary/30"
            >
              <Icon name="UserPlus" className="mr-2 h-4 w-4" />
              Создать редактора
            </Button>
            <div className="space-y-2">
              {editors.map((ed) => (
                <div
                  key={ed.id}
                  className="flex items-center justify-between p-3 glass rounded-lg text-sm"
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
                    {!ed.is_super_admin && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteEditor(ed.id)}
                      >
                        <Icon name="Trash2" className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateEditorDialog} onOpenChange={setShowCreateEditorDialog}>
        <DialogContent className="sm:max-w-md glass-card">
          <DialogHeader>
            <DialogTitle className="text-2xl gradient-text">Создать редактора</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Введите данные нового редактора
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new_username" className="text-xs uppercase tracking-wider font-semibold">
                Логин
              </Label>
              <Input
                id="new_username"
                value={newEditorUsername}
                onChange={(e) => setNewEditorUsername(e.target.value)}
                placeholder="username"
                className="glass"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_full_name" className="text-xs uppercase tracking-wider font-semibold">
                Полное имя
              </Label>
              <Input
                id="new_full_name"
                value={newEditorFullName}
                onChange={(e) => setNewEditorFullName(e.target.value)}
                placeholder="Иван Иванов"
                className="glass"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_editor_password" className="text-xs uppercase tracking-wider font-semibold">
                Пароль
              </Label>
              <Input
                id="new_editor_password"
                type="password"
                value={newEditorPassword}
                onChange={(e) => setNewEditorPassword(e.target.value)}
                placeholder="••••••••"
                className="glass"
              />
            </div>
            <Button onClick={handleCreateEditor} className="w-full gradient-primary hover:opacity-90 shadow-lg shadow-primary/30">
              Создать
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}