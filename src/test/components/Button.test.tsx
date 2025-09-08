import { describe, it, expect, vi } from 'vitest';
import { render } from '../utils/test-utils';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('renders correctly', () => {
    const { getByText } = render(<Button>Test Button</Button>);
    expect(getByText('Test Button')).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const handleClick = vi.fn();
    const { getByText } = render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = getByText('Click me');
    button.click();
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('applies different variants correctly', () => {
    const { getByText } = render(<Button variant="secondary">Secondary Button</Button>);
    const button = getByText('Secondary Button');
    expect(button).toHaveClass('bg-secondary');
  });

  it('can be disabled', () => {
    const { getByText } = render(<Button disabled>Disabled Button</Button>);
    const button = getByText('Disabled Button');
    expect(button).toBeDisabled();
  });
});