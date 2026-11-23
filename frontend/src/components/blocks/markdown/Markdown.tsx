import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import Flex from '@/components/blocks/flex/Flex';
import Boundary from '@/components/blocks/markdown/boundary/Boundary';
import Text from '@/components/blocks/text/Text';
import Title from '@/components/blocks/title/Title';

import type { MarkdownProps } from './Markdown.types';
import type { TitleProps } from '@/components/blocks/title/Title.types';
import type { Components } from 'react-markdown';

import { textVariants } from '@/components/blocks/shared/variants/typography/text.variants';
import { cn } from '@/lib/utils';

/**
 * Renders one markdown heading on the shared title scale.
 */
const MarkdownHeading = ({
    level,
    size,
    children,
}: {
    level: TitleProps['level'];
    size: TitleProps['size'];
    children: TitleProps['children'];
}) => {
    return (
        <Title level={level} size={size} spacing="none">
            {children}
        </Title>
    );
};

/**
 * Renders a markdown paragraph at the chat body size.
 */
const Paragraph: Components['p'] = ({ children }) => {
    return <Text size="sm">{children}</Text>;
};

/**
 * Renders a markdown bullet list.
 */
const BulletList: Components['ul'] = ({ children }) => {
    return <ul className="list-disc pl-md">{children}</ul>;
};

/**
 * Renders a markdown numbered list.
 */
const NumberedList: Components['ol'] = ({ children }) => {
    return <ol className="list-decimal pl-md">{children}</ol>;
};

/**
 * Renders a markdown list item at the chat body size.
 */
const ListItem: Components['li'] = ({ children }) => {
    return (
        <Text as="li" size="sm">
            {children}
        </Text>
    );
};

/**
 * Renders a markdown table that scrolls sideways when it is wider than the chat.
 */
const MarkdownTable: Components['table'] = ({ children }) => {
    return (
        <div className="w-full overflow-x-auto">
            <table className={cn(textVariants({ size: 'sm' }), 'w-full border-collapse')}>{children}</table>
        </div>
    );
};

/**
 * Renders a markdown table header cell.
 */
const HeaderCell: Components['th'] = ({ children }) => {
    return <th className={cn(textVariants({ size: 'sm', weight: 'bold' }), 'border p-sm text-left')}>{children}</th>;
};

/**
 * Renders a markdown table cell.
 */
const BodyCell: Components['td'] = ({ children }) => {
    return <td className={cn(textVariants({ size: 'sm', weight: 'regular' }), 'border p-sm text-left')}>{children}</td>;
};

/**
 * Keeps a fenced code block inside the chat width.
 */
const CodeBlock: Components['pre'] = ({ children }) => {
    return <pre className={cn(textVariants({ size: 'sm' }), 'overflow-x-auto')}>{children}</pre>;
};

/**
 * Renders a level-one markdown heading.
 */
const Heading1: Components['h1'] = ({ children }) => {
    return (
        <MarkdownHeading level={1} size="md">
            {children}
        </MarkdownHeading>
    );
};

/**
 * Renders a level-two markdown heading.
 */
const Heading2: Components['h2'] = ({ children }) => {
    return (
        <MarkdownHeading level={2} size="sm">
            {children}
        </MarkdownHeading>
    );
};

/**
 * Renders a level-three markdown heading.
 */
const Heading3: Components['h3'] = ({ children }) => {
    return (
        <MarkdownHeading level={3} size="sm">
            {children}
        </MarkdownHeading>
    );
};

/**
 * Renders a level-four markdown heading.
 */
const Heading4: Components['h4'] = ({ children }) => {
    return (
        <MarkdownHeading level={4} size="xs">
            {children}
        </MarkdownHeading>
    );
};

/**
 * Renders a level-five markdown heading.
 */
const Heading5: Components['h5'] = ({ children }) => {
    return (
        <MarkdownHeading level={5} size="xs">
            {children}
        </MarkdownHeading>
    );
};

/**
 * Renders a level-six markdown heading.
 */
const Heading6: Components['h6'] = ({ children }) => {
    return (
        <MarkdownHeading level={6} size="xs">
            {children}
        </MarkdownHeading>
    );
};

const components: Components = {
    h1: Heading1,
    h2: Heading2,
    h3: Heading3,
    h4: Heading4,
    h5: Heading5,
    h6: Heading6,
    p: Paragraph,
    ul: BulletList,
    ol: NumberedList,
    li: ListItem,
    table: MarkdownTable,
    th: HeaderCell,
    td: BodyCell,
    pre: CodeBlock,
};

/**
 * Renders an answer as GitHub-flavored Markdown.
 * A render crash shows the original text instead.
 */
const Markdown = ({ source }: MarkdownProps) => {
    return (
        <Boundary key={source} source={source}>
            <Flex direction="column" gap="sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                    {source}
                </ReactMarkdown>
            </Flex>
        </Boundary>
    );
};

Markdown.displayName = 'Markdown';

export default Markdown;

export type { MarkdownProps };
