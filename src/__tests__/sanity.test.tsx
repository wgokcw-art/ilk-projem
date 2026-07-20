import React from 'react';
import { render, screen } from '@testing-library/react';

describe('Sanity', () => {
  it('renders a simple element', () => {
    render(<div>Hello Test</div>);
    expect(screen.getByText('Hello Test')).toBeInTheDocument();
  });
});
