import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Bold, Eye, Italic, Link, List, ListOrdered } from 'lucide-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  rows = 5,
  className,
}: MarkdownEditorProps) {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText =
      value.substring(0, start) +
      before +
      selectedText +
      after +
      value.substring(end);

    onChange(newText);

    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  return (
    <div className={className}>
      <Tabs defaultValue="write" className="w-full">
        <div className="flex items-center justify-between mb-2">
          <TabsList>
            <TabsTrigger value="write" className="text-xs">
              {t('get_ready.notes.markdown.write')}
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs">
              <Eye className="h-3 w-3 mr-1" />
              {t('get_ready.notes.markdown.preview')}
            </TabsTrigger>
          </TabsList>

          {/* Markdown Toolbar */}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              type="button"
              onClick={() => insertMarkdown('**', '**')}
              className="h-7 w-7 p-0"
              title={t('get_ready.notes.markdown.bold')}
            >
              <Bold className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              type="button"
              onClick={() => insertMarkdown('*', '*')}
              className="h-7 w-7 p-0"
              title={t('get_ready.notes.markdown.italic')}
            >
              <Italic className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              type="button"
              onClick={() => insertMarkdown('- ')}
              className="h-7 w-7 p-0"
              title={t('get_ready.notes.markdown.bullet_list')}
            >
              <List className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              type="button"
              onClick={() => insertMarkdown('1. ')}
              className="h-7 w-7 p-0"
              title={t('get_ready.notes.markdown.numbered_list')}
            >
              <ListOrdered className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              type="button"
              onClick={() => insertMarkdown('[', '](url)')}
              className="h-7 w-7 p-0"
              title={t('get_ready.notes.markdown.link')}
            >
              <Link className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <TabsContent value="write" className="mt-0">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="resize-none font-mono text-sm"
          />
        </TabsContent>

        <TabsContent value="preview" className="mt-0">
          <div className="border rounded-md p-3 min-h-[120px] max-h-[300px] overflow-y-auto prose prose-sm dark:prose-invert max-w-none">
            {value ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {value}
              </ReactMarkdown>
            ) : (
              <p className="text-muted-foreground text-sm italic">
                {t('get_ready.notes.markdown.preview_empty')}
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
