"use client";

import {
  Check,
  CheckSquare2,
  FileText,
  LoaderCircle,
  NotebookPen,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import Card from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";

type PersonalCenterOwner = "jens" | "lenita";

type PersonalCenterProps = {
  owner: PersonalCenterOwner;
  displayName: string;
};

type PersonalTodo = {
  id: string;
  owner: PersonalCenterOwner;
  task: string;
  created_at: string;
};

type PersonalNote = {
  id: string;
  owner: PersonalCenterOwner;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

type NoteForm = {
  title: string;
  content: string;
};

const EMPTY_NOTE_FORM: NoteForm = {
  title: "",
  content: "",
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function PersonalCenter({
  owner,
  displayName,
}: PersonalCenterProps) {
  const [todos, setTodos] = useState<PersonalTodo[]>([]);
  const [notes, setNotes] = useState<PersonalNote[]>([]);

  const [newTask, setNewTask] = useState("");
  const [noteForm, setNoteForm] =
    useState<NoteForm>(EMPTY_NOTE_FORM);

  const [editingNoteId, setEditingNoteId] = useState<
    string | null
  >(null);
  const [editNoteForm, setEditNoteForm] =
    useState<NoteForm>(EMPTY_NOTE_FORM);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingTodo, setIsSavingTodo] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [deletingTodoId, setDeletingTodoId] = useState<
    string | null
  >(null);
  const [deletingNoteId, setDeletingNoteId] = useState<
    string | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<
    string | null
  >(null);

  const loadPersonalCenter = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const [todosResult, notesResult] = await Promise.all([
      supabase
        .from("personal_todos")
        .select("id, owner, task, created_at")
        .eq("owner", owner)
        .order("created_at", { ascending: true }),

      supabase
        .from("personal_notes")
        .select(
          "id, owner, title, content, created_at, updated_at"
        )
        .eq("owner", owner)
        .order("updated_at", { ascending: false }),
    ]);

    if (todosResult.error || notesResult.error) {
      console.error(
        "Kunde inte hämta personligt center:",
        todosResult.error ?? notesResult.error
      );

      setErrorMessage(
        `Kunde inte hämta innehållet för ${displayName}.`
      );
      setIsLoading(false);
      return;
    }

    setTodos((todosResult.data ?? []) as PersonalTodo[]);
    setNotes((notesResult.data ?? []) as PersonalNote[]);
    setIsLoading(false);
  }, [displayName, owner]);

  useEffect(() => {
    void loadPersonalCenter();
  }, [loadPersonalCenter]);

  async function addTodo(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const trimmedTask = newTask.trim();

    if (!trimmedTask || isSavingTodo) {
      return;
    }

    setIsSavingTodo(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("personal_todos")
      .insert({
        owner,
        task: trimmedTask,
      })
      .select("id, owner, task, created_at")
      .single();

    if (error) {
      console.error(
        "Kunde inte lägga till personlig uppgift:",
        error
      );

      setErrorMessage("Uppgiften kunde inte sparas.");
      setIsSavingTodo(false);
      return;
    }

    setTodos((currentTodos) => [
      ...currentTodos,
      data as PersonalTodo,
    ]);

    setNewTask("");
    setIsSavingTodo(false);
  }

  async function completeTodo(id: string) {
    if (deletingTodoId !== null) {
      return;
    }

    setDeletingTodoId(id);
    setErrorMessage(null);

    const { error } = await supabase
      .from("personal_todos")
      .delete()
      .eq("id", id)
      .eq("owner", owner);

    if (error) {
      console.error(
        "Kunde inte ta bort personlig uppgift:",
        error
      );

      setErrorMessage("Uppgiften kunde inte tas bort.");
      setDeletingTodoId(null);
      return;
    }

    setTodos((currentTodos) =>
      currentTodos.filter((todo) => todo.id !== id)
    );

    setDeletingTodoId(null);
  }

  async function addNote(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const trimmedTitle = noteForm.title.trim();
    const trimmedContent = noteForm.content.trim();

    if (
      !trimmedTitle ||
      !trimmedContent ||
      isSavingNote
    ) {
      return;
    }

    setIsSavingNote(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from("personal_notes")
      .insert({
        owner,
        title: trimmedTitle,
        content: trimmedContent,
      })
      .select(
        "id, owner, title, content, created_at, updated_at"
      )
      .single();

    if (error) {
      console.error(
        "Kunde inte lägga till personlig anteckning:",
        error
      );

      setErrorMessage(
        "Anteckningen kunde inte sparas."
      );
      setIsSavingNote(false);
      return;
    }

    setNotes((currentNotes) => [
      data as PersonalNote,
      ...currentNotes,
    ]);

    setNoteForm(EMPTY_NOTE_FORM);
    setIsSavingNote(false);
  }

  function startEditingNote(note: PersonalNote) {
    setEditingNoteId(note.id);
    setEditNoteForm({
      title: note.title,
      content: note.content,
    });
    setErrorMessage(null);
  }

  function cancelEditingNote() {
    if (isSavingNote) {
      return;
    }

    setEditingNoteId(null);
    setEditNoteForm(EMPTY_NOTE_FORM);
  }

  async function saveEditedNote(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!editingNoteId || isSavingNote) {
      return;
    }

    const trimmedTitle = editNoteForm.title.trim();
    const trimmedContent = editNoteForm.content.trim();

    if (!trimmedTitle || !trimmedContent) {
      setErrorMessage(
        "Anteckningen behöver både rubrik och innehåll."
      );
      return;
    }

    setIsSavingNote(true);
    setErrorMessage(null);

    const updatedAt = new Date().toISOString();

    const { data, error } = await supabase
      .from("personal_notes")
      .update({
        title: trimmedTitle,
        content: trimmedContent,
        updated_at: updatedAt,
      })
      .eq("id", editingNoteId)
      .eq("owner", owner)
      .select(
        "id, owner, title, content, created_at, updated_at"
      )
      .single();

    if (error) {
      console.error(
        "Kunde inte uppdatera anteckningen:",
        error
      );

      setErrorMessage(
        "Ändringarna kunde inte sparas."
      );
      setIsSavingNote(false);
      return;
    }

    setNotes((currentNotes) =>
      currentNotes
        .map((note) =>
          note.id === editingNoteId
            ? (data as PersonalNote)
            : note
        )
        .sort(
          (firstNote, secondNote) =>
            new Date(secondNote.updated_at).getTime() -
            new Date(firstNote.updated_at).getTime()
        )
    );

    setEditingNoteId(null);
    setEditNoteForm(EMPTY_NOTE_FORM);
    setIsSavingNote(false);
  }

  async function deleteNote(id: string) {
    if (deletingNoteId !== null) {
      return;
    }

    setDeletingNoteId(id);
    setErrorMessage(null);

    const { error } = await supabase
      .from("personal_notes")
      .delete()
      .eq("id", id)
      .eq("owner", owner);

    if (error) {
      console.error(
        "Kunde inte ta bort anteckningen:",
        error
      );

      setErrorMessage(
        "Anteckningen kunde inte tas bort."
      );
      setDeletingNoteId(null);
      return;
    }

    setNotes((currentNotes) =>
      currentNotes.filter((note) => note.id !== id)
    );

    if (editingNoteId === id) {
      setEditingNoteId(null);
      setEditNoteForm(EMPTY_NOTE_FORM);
    }

    setDeletingNoteId(null);
  }

  if (isLoading) {
    return (
      <Card
        title={`${displayName}: Personligt center`}
        icon={<UserRound size={28} />}
      >
        <div className="flex min-h-60 flex-col items-center justify-center gap-3">
          <LoaderCircle
            size={32}
            className="animate-spin text-blue-300"
          />

          <p className="text-sm text-slate-400">
            Hämtar personligt innehåll…
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-black/10 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-300">
            <UserRound size={25} />
          </div>

          <div>
            <h2 className="text-xl font-bold text-white">
              {displayName}: Personligt center
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Personliga uppgifter och anteckningar.
            </p>
          </div>
        </div>
      </section>

      {errorMessage && (
        <div className="flex flex-col gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-red-200">
            {errorMessage}
          </p>

          <button
            type="button"
            onClick={() => void loadPersonalCenter()}
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-300/20 bg-red-300/10 px-3 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-300/20"
          >
            <RefreshCw size={16} />
            Hämta igen
          </button>
        </div>
      )}

      <Card
        title="Personlig att göra-lista"
        icon={<CheckSquare2 size={28} />}
      >
        <form
          onSubmit={addTodo}
          className="rounded-2xl border border-white/10 bg-white/5 p-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={newTask}
              onChange={(event) =>
                setNewTask(event.target.value)
              }
              placeholder={`Vad behöver ${displayName} göra?`}
              maxLength={200}
              autoComplete="off"
              className="min-h-12 w-full flex-1 rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
            />

            <button
              type="submit"
              disabled={!newTask.trim() || isSavingTodo}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSavingTodo ? (
                <LoaderCircle
                  size={19}
                  className="animate-spin"
                />
              ) : (
                <Plus size={19} />
              )}

              {isSavingTodo ? "Sparar…" : "Lägg till"}
            </button>
          </div>
        </form>

        <div className="mt-5">
          {todos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
              <CheckSquare2
                size={36}
                className="mx-auto text-blue-300"
              />

              <p className="mt-3 font-semibold text-white">
                Inga personliga uppgifter
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Lägg till något som behöver göras.
              </p>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {todos.map((todo) => {
                const isDeleting =
                  deletingTodoId === todo.id;

                return (
                  <li
                    key={todo.id}
                    className="rounded-2xl border border-white/10 bg-white/5 transition hover:bg-white/10"
                  >
                    <label className="flex cursor-pointer items-center gap-4 p-4">
                      <span className="relative flex h-7 w-7 shrink-0 items-center justify-center">
                        <input
                          type="checkbox"
                          checked={isDeleting}
                          disabled={deletingTodoId !== null}
                          onChange={() =>
                            void completeTodo(todo.id)
                          }
                          aria-label={`Markera ${todo.task} som klar`}
                          className="peer h-7 w-7 cursor-pointer appearance-none rounded-lg border-2 border-slate-500 bg-slate-950/40 transition checked:border-emerald-400 checked:bg-emerald-500 disabled:cursor-wait disabled:opacity-60"
                        />

                        {isDeleting ? (
                          <LoaderCircle
                            size={17}
                            className="pointer-events-none absolute animate-spin text-white"
                          />
                        ) : (
                          <Check
                            size={17}
                            className="pointer-events-none absolute scale-0 text-white transition peer-checked:scale-100"
                          />
                        )}
                      </span>

                      <span className="min-w-0 flex-1 break-words font-medium text-white">
                        {todo.task}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Bocka i en uppgift när den är klar. Då tas
          den bort från listan.
        </p>
      </Card>

      <Card
        title="Personliga anteckningar"
        icon={<NotebookPen size={28} />}
      >
        <form
          onSubmit={addNote}
          className="rounded-2xl border border-white/10 bg-white/5 p-4"
        >
          <div className="grid gap-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">
                Rubrik
              </span>

              <input
                type="text"
                value={noteForm.title}
                onChange={(event) =>
                  setNoteForm((currentForm) => ({
                    ...currentForm,
                    title: event.target.value,
                  }))
                }
                placeholder="Till exempel Idéer"
                maxLength={100}
                className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">
                Anteckning
              </span>

              <textarea
                value={noteForm.content}
                onChange={(event) =>
                  setNoteForm((currentForm) => ({
                    ...currentForm,
                    content: event.target.value,
                  }))
                }
                placeholder="Skriv din anteckning här…"
                rows={5}
                maxLength={3000}
                className="w-full resize-y rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
              />
            </label>

            <button
              type="submit"
              disabled={
                !noteForm.title.trim() ||
                !noteForm.content.trim() ||
                isSavingNote
              }
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40 sm:w-fit"
            >
              {isSavingNote &&
              editingNoteId === null ? (
                <LoaderCircle
                  size={19}
                  className="animate-spin"
                />
              ) : (
                <Plus size={19} />
              )}

              Lägg till anteckning
            </button>
          </div>
        </form>

        <div className="mt-5">
          {notes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
              <FileText
                size={36}
                className="mx-auto text-blue-300"
              />

              <p className="mt-3 font-semibold text-white">
                Inga anteckningar ännu
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Skapa den första personliga anteckningen.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {notes.map((note) => {
                const isEditing =
                  editingNoteId === note.id;
                const isDeleting =
                  deletingNoteId === note.id;

                if (isEditing) {
                  return (
                    <form
                      key={note.id}
                      onSubmit={saveEditedNote}
                      className="rounded-2xl border border-blue-300/20 bg-blue-400/10 p-4"
                    >
                      <input
                        type="text"
                        value={editNoteForm.title}
                        onChange={(event) =>
                          setEditNoteForm(
                            (currentForm) => ({
                              ...currentForm,
                              title: event.target.value,
                            })
                          )
                        }
                        maxLength={100}
                        className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 font-semibold text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                      />

                      <textarea
                        value={editNoteForm.content}
                        onChange={(event) =>
                          setEditNoteForm(
                            (currentForm) => ({
                              ...currentForm,
                              content: event.target.value,
                            })
                          )
                        }
                        rows={6}
                        maxLength={3000}
                        className="mt-3 w-full resize-y rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                      />

                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <button
                          type="submit"
                          disabled={
                            isSavingNote ||
                            !editNoteForm.title.trim() ||
                            !editNoteForm.content.trim()
                          }
                          className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-2 font-semibold text-white transition hover:bg-blue-400 disabled:opacity-40"
                        >
                          {isSavingNote ? (
                            <LoaderCircle
                              size={18}
                              className="animate-spin"
                            />
                          ) : (
                            <Save size={18} />
                          )}

                          Spara
                        </button>

                        <button
                          type="button"
                          onClick={cancelEditingNote}
                          disabled={isSavingNote}
                          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                        >
                          <X size={18} />
                          Avbryt
                        </button>
                      </div>
                    </form>
                  );
                }

                return (
                  <article
                    key={note.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="break-words text-lg font-semibold text-white">
                          {note.title}
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          Uppdaterad{" "}
                          {formatDate(note.updated_at)}
                        </p>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            startEditingNote(note)
                          }
                          aria-label={`Redigera ${note.title}`}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:bg-blue-400/10 hover:text-blue-300"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void deleteNote(note.id)
                          }
                          disabled={deletingNoteId !== null}
                          aria-label={`Ta bort ${note.title}`}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:bg-red-400/10 hover:text-red-300 disabled:opacity-50"
                        >
                          {isDeleting ? (
                            <LoaderCircle
                              size={16}
                              className="animate-spin"
                            />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">
                      {note.content}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}