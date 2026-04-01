import { render, screen } from '@testing-library/react';

import Heading from './Heading';

describe('Heading component', () => {
  it('renders the correct heading tag based on the "level" prop value', () => {
    render(<Heading level={1}>Heading 1</Heading>);
    const heading1 = screen.getByText('Heading 1');
    expect(heading1.tagName).toBe('H1');
  });

  it('"data-remove-margin" attribute value is true when "removeMargin" is true', () => {
    render(<Heading level={1} removeMargin={true}>Heading with margin removed</Heading>);
    const heading = screen.getByText('Heading with margin removed');
    expect(heading).toHaveAttribute('data-remove-margin', 'true');
  });

  it('"data-remove-margin" attribute value is false when "removeMargin" is false', () => {
    render(<Heading level={1} removeMargin={false}>Heading with margin removed</Heading>);
    const heading = screen.getByText('Heading with margin removed');
    expect(heading).toHaveAttribute('data-remove-margin', 'false');
  });
});