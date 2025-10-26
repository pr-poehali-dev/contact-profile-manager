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

const API_URL = 'https://functions.poehali.dev/b8613daf-13ab-4b83-a7a5-6f4176fc41d6';

export default function Index() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [editingContact, setEditingContact] = useState<Partial<Contact> | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const response = await fetch(API_URL);
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

  const handlePasswordSubmit = () => {
    if (password) {
      setIsAdminMode(true);
      setShowPasswordDialog(false);
      toast({
        title: 'Успешно',
        description: 'Вы вошли в режим редактирования',
      });
    }
  };

  const handleSaveContact = async () => {
    if (!editingContact || !password) return;

    try {
      const method = editingContact.id ? 'PUT' : 'POST';
      const response = await fetch(API_URL, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password,
        },
        body: JSON.stringify(editingContact),
      });

      if (response.status === 401) {
        toast({
          title: 'Ошибка',
          description: 'Неверный пароль администратора',
          variant: 'destructive',
        });
        setIsAdminMode(false);
        setPassword('');
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
    if (!password) return;

    try {
      const response = await fetch(API_URL, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': password,
        },
        body: JSON.stringify({ id }),
      });

      if (response.status === 401) {
        toast({
          title: 'Ошибка',
          description: 'Неверный пароль администратора',
          variant: 'destructive',
        });
        setIsAdminMode(false);
        setPassword('');
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

  const openTelegram = (username: string) => {
    window.open(`https://t.me/${username}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-background">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
              Контакты
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Свяжитесь с нами через Telegram
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
            {contacts.map((contact, index) => (
              <Card
                key={contact.id}
                className="p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105 animate-scale-in border-2 hover:border-primary/50 relative group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    {contact.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-xl mb-1">{contact.name}</h3>
                    {contact.position && (
                      <p className="text-sm text-muted-foreground mb-3">{contact.position}</p>
                    )}
                  </div>
                  <Button
                    onClick={() => openTelegram(contact.telegram_username)}
                    className="w-full bg-gradient-to-r from-primary to-secondary hover:from-secondary hover:to-primary transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <Icon name="Send" className="mr-2 h-4 w-4" />
                    Написать в Telegram
                  </Button>

                  {isAdminMode && (
                    <div className="flex gap-2 w-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingContact(contact);
                          setShowEditDialog(true);
                        }}
                        className="flex-1"
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

          <div className="flex justify-center gap-4">
            {!isAdminMode ? (
              <Button
                variant="outline"
                onClick={() => setShowPasswordDialog(true)}
                className="group hover:border-primary"
              >
                <Icon name="Settings" className="mr-2 h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
                Режим редактирования
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => {
                    setEditingContact({ display_order: contacts.length });
                    setShowEditDialog(true);
                  }}
                  className="bg-gradient-to-r from-primary to-secondary"
                >
                  <Icon name="Plus" className="mr-2 h-4 w-4" />
                  Добавить контакт
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAdminMode(false);
                    setPassword('');
                    toast({
                      title: 'Выход',
                      description: 'Вы вышли из режима редактирования',
                    });
                  }}
                >
                  <Icon name="LogOut" className="mr-2 h-4 w-4" />
                  Выйти
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Вход в режим редактирования</DialogTitle>
            <DialogDescription>
              Введите пароль администратора для доступа к редактированию контактов
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                placeholder="Введите пароль"
              />
            </div>
            <Button onClick={handlePasswordSubmit} className="w-full">
              Войти
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingContact?.id ? 'Редактировать контакт' : 'Добавить контакт'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                value={editingContact?.name || ''}
                onChange={(e) =>
                  setEditingContact({ ...editingContact, name: e.target.value })
                }
                placeholder="Иван Иванов"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telegram">Telegram (без @)</Label>
              <Input
                id="telegram"
                value={editingContact?.telegram_username || ''}
                onChange={(e) =>
                  setEditingContact({ ...editingContact, telegram_username: e.target.value })
                }
                placeholder="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Должность</Label>
              <Input
                id="position"
                value={editingContact?.position || ''}
                onChange={(e) =>
                  setEditingContact({ ...editingContact, position: e.target.value })
                }
                placeholder="Менеджер"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="order">Порядок отображения</Label>
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
              />
            </div>
            <Button onClick={handleSaveContact} className="w-full">
              Сохранить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
