import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Button from '../Button';

describe('Button', () => {
 it('renders correctly with default props', () => {
    render(<Button>Click me</Button>);
    const buttonElement = screen.getByText('Click me');
    expect(buttonElement).toBeInTheDocument();
    expect(buttonElement).toHaveClass('bg-blue-600');
  });

  it('renders with different variant', () => {
    render(<Button variant="danger">Delete</Button>);
    const buttonElement = screen.getByText('Delete');
    expect(buttonElement).toHaveClass('bg-red-600');
  });

  it('renders with different size', () => {
    render(<Button size="lg">Large Button</Button>);
    const buttonElement = screen.getByText('Large Button');
    expect(buttonElement).toHaveClass('text-base');
  });

  it('is disabled when loading is true', () => {
    render(<Button loading>Processing</Button>);
    const buttonElement = screen.getByText('Processing');
    expect(buttonElement).toBeDisabled();
  });

  it('triggers onClick when clicked', () => {
    const mockOnClick = jest.fn();
    render(<Button onClick={mockOnClick}>Click me</Button>);
    const buttonElement = screen.getByText('Click me');
    fireEvent.click(buttonElement);
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });
});